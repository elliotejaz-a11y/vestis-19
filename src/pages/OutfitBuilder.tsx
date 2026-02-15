import { useState, useMemo, useRef, useCallback } from "react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { Shuffle, Check, X, GripVertical, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CATEGORY_ORDER = ["accessories", "outerwear", "tops", "dresses", "bottoms", "shoes"];

function SortableOutfitItem({ item }: { item: ClothingItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const isSmall = item.category === "accessories" || item.category === "shoes";
  const sizeClass = item.category === "dresses" ? "w-24 h-28" : isSmall ? "w-14 h-14" : "w-24 h-24";

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-1 flex-shrink-0", isDragging && "scale-105")}>
      <button {...attributes} {...listeners} className="touch-none p-1 text-muted-foreground/50 hover:text-muted-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className={sizeClass}>
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
      </div>
    </div>
  );
}

interface Props {
  items: ClothingItem[];
}

export default function OutfitBuilder({ items }: Props) {
  const [selected, setSelected] = useState<Record<string, ClothingItem | null>>({});
  const [activeCategory, setActiveCategory] = useState<string>("tops");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [previewScale, setPreviewScale] = useState(1);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const categorizedItems = useMemo(() => {
    const map: Record<string, ClothingItem[]> = {};
    for (const cat of CATEGORIES) map[cat.value] = [];
    for (const item of items) {
      if (map[item.category]) map[item.category].push(item);
    }
    return map;
  }, [items]);

  const toggleItem = (item: ClothingItem) => {
    setSelected((prev) => {
      const wasSelected = prev[item.category]?.id === item.id;
      const next = { ...prev, [item.category]: wasSelected ? null : item };
      if (!wasSelected) {
        setOrderedIds((ids) => [...ids.filter((id) => id !== item.id), item.id]);
      } else {
        setOrderedIds((ids) => ids.filter((id) => id !== item.id));
      }
      return next;
    });
  };

  const randomize = () => {
    const newSelected: Record<string, ClothingItem | null> = {};
    const newIds: string[] = [];
    for (const cat of CATEGORIES) {
      const catItems = categorizedItems[cat.value];
      if (catItems.length > 0) {
        const picked = catItems[Math.floor(Math.random() * catItems.length)];
        newSelected[cat.value] = picked;
        newIds.push(picked.id);
      }
    }
    setSelected(newSelected);
    setOrderedIds(newIds);
  };

  const clearAll = () => {
    setSelected({});
    setOrderedIds([]);
    setPreviewScale(1);
  };

  const selectedItems = Object.values(selected).filter(Boolean) as ClothingItem[];

  const sortedSelected = useMemo(() => {
    const itemMap = new Map(selectedItems.map((i) => [i.id, i]));
    // Use custom order if available, fallback to category order
    const ordered = orderedIds.filter((id) => itemMap.has(id)).map((id) => itemMap.get(id)!);
    // Add any items not in orderedIds
    const remaining = selectedItems.filter((i) => !orderedIds.includes(i.id));
    remaining.sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a.category);
      const bIdx = CATEGORY_ORDER.indexOf(b.category);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
    return [...ordered, ...remaining];
  }, [selectedItems, orderedIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds((ids) => {
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        return arrayMove(ids, oldIndex, newIndex);
      });
    }
  };

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
        <p className="text-sm text-muted-foreground mt-0.5">Create your own outfit from head to toe</p>
      </header>

      {/* Flat-lay outfit preview */}
      {sortedSelected.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl bg-white border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Your Outfit ({sortedSelected.length} pieces)</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewScale((s) => Math.max(0.5, s - 0.1))} className="text-muted-foreground hover:text-foreground">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-muted-foreground min-w-[32px] text-center">{Math.round(previewScale * 100)}%</span>
                <button onClick={() => setPreviewScale((s) => Math.min(2, s + 0.1))} className="text-muted-foreground hover:text-foreground">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 ml-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
            <div
              ref={previewContainerRef}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="overflow-hidden touch-none"
            >
              <div
                className="flex flex-col items-center -space-y-2 transition-transform origin-center"
                style={{ transform: `scale(${previewScale})` }}
              >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedSelected.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {sortedSelected.map((item) => (
                      <SortableOutfitItem key={item.id} item={item} />
                    ))}
                  </SortableContext>
                </DndContext>
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
