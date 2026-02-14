import { useState, useMemo } from "react";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { Shuffle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = ["accessories", "outerwear", "tops", "dresses", "bottoms", "shoes"];

interface Props {
  items: ClothingItem[];
}

export default function OutfitBuilder({ items }: Props) {
  const [selected, setSelected] = useState<Record<string, ClothingItem | null>>({});
  const [activeCategory, setActiveCategory] = useState<string>("tops");

  const categorizedItems = useMemo(() => {
    const map: Record<string, ClothingItem[]> = {};
    for (const cat of CATEGORIES) map[cat.value] = [];
    for (const item of items) {
      if (map[item.category]) map[item.category].push(item);
    }
    return map;
  }, [items]);

  const toggleItem = (item: ClothingItem) => {
    setSelected((prev) => ({
      ...prev,
      [item.category]: prev[item.category]?.id === item.id ? null : item,
    }));
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
  };

  const clearAll = () => setSelected({});

  const selectedItems = Object.values(selected).filter(Boolean) as ClothingItem[];
  const sortedSelected = [...selectedItems].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

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
              <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              {(() => {
                const outerwear = sortedSelected.filter(i => i.category === "outerwear");
                const tops = sortedSelected.filter(i => i.category === "tops");
                const rest = sortedSelected.filter(i => i.category !== "outerwear" && i.category !== "tops");

                return (
                  <>
                    {sortedSelected.filter(i => i.category === "accessories").map((item) => (
                      <div key={item.id} className="w-16 h-16 flex-shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                      </div>
                    ))}
                    {(outerwear.length > 0 || tops.length > 0) && (
                      <div className="flex items-start justify-center gap-2">
                        {outerwear.map((item) => (
                          <div key={item.id} className="w-20 h-20 flex-shrink-0 -mt-2">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                          </div>
                        ))}
                        {tops.map((item) => (
                          <div key={item.id} className="w-24 h-24 flex-shrink-0">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                    {rest.filter(i => i.category !== "accessories").map((item) => {
                      const isSmall = item.category === "shoes";
                      const size = isSmall ? "w-16 h-16" : "w-24 h-24";
                      return (
                        <div key={item.id} className={cn("flex-shrink-0", size)}>
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                        </div>
                      );
                    })}
                  </>
                );
              })()}
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
