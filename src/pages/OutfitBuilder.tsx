import { useState, useMemo, useRef, useCallback } from "react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { Shuffle, Check, X, RotateCcw, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_ORDER = ["accessories", "outerwear", "jumpers", "tops", "dresses", "bottoms", "shoes"];

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  accessories: { x: 50, y: 5 },
  outerwear: { x: 30, y: 25 },
  jumpers: { x: 42, y: 30 },
  tops: { x: 55, y: 28 },
  dresses: { x: 50, y: 45 },
  bottoms: { x: 50, y: 58 },
  shoes: { x: 50, y: 85 },
};

const ITEM_SIZES: Record<string, { w: number; h: number }> = {
  accessories: { w: 56, h: 56 },
  outerwear: { w: 80, h: 80 },
  jumpers: { w: 88, h: 88 },
  tops: { w: 96, h: 96 },
  dresses: { w: 96, h: 112 },
  bottoms: { w: 96, h: 96 },
  shoes: { w: 56, h: 56 },
};

interface Props {
  items: ClothingItem[];
  onSaveOutfit?: (id: string, saved: boolean, name?: string, description?: string) => void;
}

export default function OutfitBuilder({ items, onSaveOutfit }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Record<string, ClothingItem | null>>({});
  const [activeCategory, setActiveCategory] = useState<string>("tops");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [scales, setScales] = useState<Record<string, number>>({});
  const [zOrder, setZOrder] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const pinchRef = useRef<{ itemId: string; startDist: number; startScale: number } | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const zCounterRef = useRef(1);

  const categorizedItems = useMemo(() => {
    const map: Record<string, ClothingItem[]> = {};
    for (const cat of CATEGORIES) map[cat.value] = [];
    for (const item of items) {
      if (map[item.category]) map[item.category].push(item);
    }
    return map;
  }, [items]);

  const getItemPos = (item: ClothingItem) =>
    positions[item.id] || DEFAULT_POSITIONS[item.category] || { x: 50, y: 50 };

  const getItemScale = (id: string) => scales[id] ?? 1;

  const toggleItem = (item: ClothingItem) => {
    setSelected((prev) => {
      const wasSelected = prev[item.category]?.id === item.id;
      return { ...prev, [item.category]: wasSelected ? null : item };
    });
  };

  const randomize = () => {
    const newSelected: Record<string, ClothingItem | null> = {};
    for (const cat of CATEGORIES) {
      const catItems = categorizedItems[cat.value];
      if (catItems.length > 0) {
        newSelected[cat.value] = catItems[Math.floor(Math.random() * catItems.length)];
      }
    }
    setSelected(newSelected);
    setPositions({});
    setScales({});
    setZOrder({});
  };

  const clearAll = () => {
    setSelected({});
    setPositions({});
    setScales({});
    setZOrder({});
  };

  const resetLayout = () => {
    setPositions({});
    setScales({});
    setZOrder({});
  };

  const selectedItems = Object.values(selected).filter(Boolean) as ClothingItem[];
  const sortedForRender = [...selectedItems].sort((a, b) => {
    const az = zOrder[a.id] || CATEGORY_ORDER.indexOf(a.category);
    const bz = zOrder[b.id] || CATEGORY_ORDER.indexOf(b.category);
    return az - bz;
  });

  const bringToFront = (id: string) => {
    zCounterRef.current += 1;
    setZOrder((prev) => ({ ...prev, [id]: zCounterRef.current + 10 }));
  };

  const SCALE_STEPS = [1, 1.4, 1.8, 0.6];
  const handleDoubleTap = (id: string) => {
    setScales((prev) => {
      const current = prev[id] ?? 1;
      const idx = SCALE_STEPS.findIndex((s) => Math.abs(s - current) < 0.05);
      const next = SCALE_STEPS[(idx + 1) % SCALE_STEPS.length];
      return { ...prev, [id]: next };
    });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent, item: ClothingItem) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getItemPos(item);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    setDraggingId(item.id);
    bringToFront(item.id);

    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === item.id && now - lastTapRef.current.time < 300) {
      handleDoubleTap(item.id);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: item.id, time: now };
    }
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(100, dragRef.current.startPosX + dx));
    const newY = Math.max(0, Math.min(100, dragRef.current.startPosY + dy));
    setPositions((prev) => ({ ...prev, [draggingId]: { x: newX, y: newY } }));
  }, [draggingId]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setDraggingId(null);
  }, []);

  const getTouchDist = (t: React.TouchList) =>
    Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);

  const findItemUnderTouch = (t: React.TouchList): string | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = ((t[0].clientX + t[1].clientX) / 2 - rect.left) / rect.width * 100;
    const cy = ((t[0].clientY + t[1].clientY) / 2 - rect.top) / rect.height * 100;
    let best: { id: string; z: number } | null = null;
    for (const item of selectedItems) {
      const pos = getItemPos(item);
      const size = ITEM_SIZES[item.category] || { w: 80, h: 80 };
      const halfW = (size.w / rect.width) * 100 * 1.5;
      const halfH = (size.h / rect.height) * 100 * 1.5;
      if (Math.abs(cx - pos.x) < halfW && Math.abs(cy - pos.y) < halfH) {
        const z = zOrder[item.id] || CATEGORY_ORDER.indexOf(item.category);
        if (!best || z > best.z) best = { id: item.id, z };
      }
    }
    return best?.id ?? null;
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const itemId = findItemUnderTouch(e.touches);
      if (itemId) {
        pinchRef.current = { itemId, startDist: getTouchDist(e.touches), startScale: getItemScale(itemId) };
      }
    }
  }, [selectedItems, positions, scales, zOrder]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const ratio = dist / pinchRef.current.startDist;
      const newScale = Math.min(2.5, Math.max(0.3, pinchRef.current.startScale * ratio));
      setScales((prev) => ({ ...prev, [pinchRef.current!.itemId]: newScale }));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  // Save the current outfit to the database
  const handleSaveOutfit = async () => {
    if (!user || selectedItems.length < 2) return;
    setSaving(true);
    try {
      const { data: outfitRow, error: outfitErr } = await supabase
        .from("outfits")
        .insert({
          user_id: user.id,
          occasion: "Custom outfit",
          reasoning: "Created in Outfit Builder",
          saved: true,
        })
        .select()
        .single();

      if (outfitErr || !outfitRow) throw outfitErr;

      await supabase.from("outfit_items").insert(
        selectedItems.map((item) => ({
          outfit_id: outfitRow.id,
          clothing_item_id: item.id,
        }))
      );

      toast({ title: "Outfit saved! ✨", description: "Your outfit has been saved to your wardrobe." });
      
      if (onSaveOutfit) onSaveOutfit(outfitRow.id, true);
    } catch (err) {
      console.error("Save outfit failed:", err);
      toast({ title: "Failed to save outfit", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outfit Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Drag to move · Double-tap to resize · Pinch to scale</p>
      </header>

      {sortedForRender.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl bg-white border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Your Outfit ({sortedForRender.length} pieces)</p>
              <div className="flex items-center gap-2">
                <button onClick={resetLayout} className="text-muted-foreground hover:text-foreground" title="Reset layout">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
            <div
              ref={canvasRef}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="relative overflow-hidden rounded-xl bg-muted/20"
              style={{ height: 320, touchAction: "none" }}
            >
              {sortedForRender.map((item) => {
                const pos = getItemPos(item);
                const baseSize = ITEM_SIZES[item.category] || { w: 80, h: 80 };
                const s = getItemScale(item.id);
                const isDragging = draggingId === item.id;
                return (
                  <div
                    key={item.id}
                    onPointerDown={(e) => handlePointerDown(e, item)}
                    className={cn(
                      "absolute cursor-grab active:cursor-grabbing select-none",
                      isDragging && "ring-2 ring-accent/50 rounded-lg shadow-lg"
                    )}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: baseSize.w,
                      height: baseSize.h,
                      transform: `translate(-50%, -50%) scale(${s})`,
                      zIndex: zOrder[item.id] || CATEGORY_ORDER.indexOf(item.category),
                      transition: isDragging ? "none" : "box-shadow 0.2s, transform 0.2s",
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain drop-shadow-sm pointer-events-none"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-5 pb-4 space-y-2">
        <Button
          onClick={randomize}
          disabled={items.length < 2}
          className="w-full h-11 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
        >
          <Shuffle className="w-4 h-4 mr-2" /> Randomize Outfit
        </Button>
        {selectedItems.length >= 2 && (
          <Button
            onClick={handleSaveOutfit}
            disabled={saving}
            variant="outline"
            className="w-full h-11 rounded-2xl text-sm"
          >
            <Bookmark className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save This Outfit"}
          </Button>
        )}
      </div>

      {/* Category tabs */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              activeCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border"
            )}
          >
            {cat.icon} {cat.label} ({categorizedItems[cat.value]?.length || 0})
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="px-4 grid grid-cols-3 gap-2">
        {(categorizedItems[activeCategory] || []).map((item) => {
          const isSelected = selected[item.category]?.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item)}
              className={cn(
                "relative rounded-xl overflow-hidden border-2 transition-all",
                isSelected ? "border-accent ring-2 ring-accent/30" : "border-border/40"
              )}
            >
              <div className="aspect-square bg-white">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <p className="text-[9px] text-muted-foreground p-1.5 truncate text-center">{item.name}</p>
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent-foreground" />
                </div>
              )}
            </button>
          );
        })}
        {(categorizedItems[activeCategory] || []).length === 0 && (
          <div className="col-span-3 py-12 text-center">
            <p className="text-xs text-muted-foreground">No {activeCategory} in your wardrobe yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
