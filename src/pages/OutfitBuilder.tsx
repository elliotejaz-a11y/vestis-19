import { useState, useMemo, useRef, useCallback } from "react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { Shuffle, Check, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = ["accessories", "outerwear", "tops", "dresses", "bottoms", "shoes"];

// Default positions for each category (percentage-based, centered layout)
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  accessories: { x: 50, y: 5 },
  outerwear: { x: 30, y: 25 },
  tops: { x: 55, y: 28 },
  dresses: { x: 50, y: 45 },
  bottoms: { x: 50, y: 58 },
  shoes: { x: 50, y: 85 },
};

const ITEM_SIZES: Record<string, { w: number; h: number }> = {
  accessories: { w: 56, h: 56 },
  outerwear: { w: 80, h: 80 },
  tops: { w: 96, h: 96 },
  dresses: { w: 96, h: 112 },
  bottoms: { w: 96, h: 96 },
  shoes: { w: 56, h: 56 },
};

interface Props {
  items: ClothingItem[];
}

export default function OutfitBuilder({ items }: Props) {
  const [selected, setSelected] = useState<Record<string, ClothingItem | null>>({});
  const [activeCategory, setActiveCategory] = useState<string>("tops");
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zOrder, setZOrder] = useState<Record<string, number>>({});
  const [previewScale, setPreviewScale] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
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

  const getItemPos = (item: ClothingItem) => {
    return positions[item.id] || DEFAULT_POSITIONS[item.category] || { x: 50, y: 50 };
  };

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
    setZOrder({});
  };

  const clearAll = () => {
    setSelected({});
    setPositions({});
    setZOrder({});
    setPreviewScale(1);
  };

  const resetPositions = () => {
    setPositions({});
    setZOrder({});
  };

  const selectedItems = Object.values(selected).filter(Boolean) as ClothingItem[];
  const sortedForRender = [...selectedItems].sort((a, b) => {
    const az = zOrder[a.id] || CATEGORY_ORDER.indexOf(a.category);
    const bz = zOrder[b.id] || CATEGORY_ORDER.indexOf(b.category);
    return az - bz;
  });

  // Freeform drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, item: ClothingItem) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pos = getItemPos(item);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    setDraggingId(item.id);
    // Bring to front
    zCounterRef.current += 1;
    setZOrder((prev) => ({ ...prev, [item.id]: zCounterRef.current + 10 }));
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100 / previewScale;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100 / previewScale;
    const newX = Math.max(0, Math.min(100, dragRef.current.startPosX + dx));
    const newY = Math.max(0, Math.min(100, dragRef.current.startPosY + dy));
    setPositions((prev) => ({ ...prev, [draggingId]: { x: newX, y: newY } }));
  }, [draggingId, previewScale]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setDraggingId(null);
  }, []);

  // Pinch-to-zoom handlers
  const getTouchDist = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: getTouchDist(e.touches), startScale: previewScale };
    }
  }, [previewScale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const ratio = dist / pinchRef.current.startDist;
      setPreviewScale(Math.min(2, Math.max(0.5, pinchRef.current.startScale * ratio)));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Outfit Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Drag items freely to arrange your outfit</p>
      </header>

      {/* Freeform outfit canvas */}
      {sortedForRender.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl bg-white border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Your Outfit ({sortedForRender.length} pieces)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewScale((s) => Math.max(0.5, s - 0.1))} className="text-muted-foreground hover:text-foreground">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-muted-foreground min-w-[32px] text-center">{Math.round(previewScale * 100)}%</span>
                <button onClick={() => setPreviewScale((s) => Math.min(2, s + 0.1))} className="text-muted-foreground hover:text-foreground">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={resetPositions} className="text-muted-foreground hover:text-foreground" title="Reset positions">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1">
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
              <div className="absolute inset-0 origin-center" style={{ transform: `scale(${previewScale})` }}>
                {sortedForRender.map((item) => {
                  const pos = getItemPos(item);
                  const size = ITEM_SIZES[item.category] || { w: 80, h: 80 };
                  const isDragging = draggingId === item.id;
                  return (
                    <div
                      key={item.id}
                      onPointerDown={(e) => handlePointerDown(e, item)}
                      className={cn(
                        "absolute cursor-grab active:cursor-grabbing transition-shadow select-none",
                        isDragging && "ring-2 ring-accent/50 rounded-lg shadow-lg"
                      )}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: size.w,
                        height: size.h,
                        transform: "translate(-50%, -50%)",
                        zIndex: zOrder[item.id] || CATEGORY_ORDER.indexOf(item.category),
                        transition: isDragging ? "none" : "box-shadow 0.2s",
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
        </div>
      )}

      {/* Randomize button */}
      <div className="px-5 pb-4">
        <Button
          onClick={randomize}
          disabled={items.length < 2}
          className="w-full h-11 rounded-2xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90"
        >
          <Shuffle className="w-4 h-4 mr-2" /> Randomize Outfit
        </Button>
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
