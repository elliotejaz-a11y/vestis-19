import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ClothingItem, CATEGORIES, PRESET_ITEMS, ClothingCategory } from "@/types/wardrobe";
import { presetImages } from "@/assets/presets";
import { Check, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onAdd: (item: ClothingItem) => void;
  children: React.ReactNode;
}

export function PresetItemsSheet({ onAdd, children }: Props) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>("tops");
  const [added, setAdded] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const filtered = PRESET_ITEMS.filter((p) => p.category === activeCategory);

  const handleAdd = (preset: typeof PRESET_ITEMS[0]) => {
    if (added.has(preset.name)) return;

    const imageUrl = presetImages[preset.name] || "";
    const item: ClothingItem = {
      id: crypto.randomUUID(),
      name: preset.name,
      category: preset.category,
      color: preset.color,
      fabric: preset.fabric,
      imageUrl,
      tags: [...preset.tags, preset.color.toLowerCase(), preset.fabric.toLowerCase()],
      notes: "Added from presets",
      addedAt: new Date(),
      estimatedPrice: undefined,
    };

    onAdd(item);
    setAdded((prev) => new Set(prev).add(preset.name));
    toast({ title: `Added ${preset.name}` });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" /> Wardrobe Essentials
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  activeCategory === cat.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground border border-border"
                )}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            {filtered.map((preset) => {
              const isAdded = added.has(preset.name);
              const imgSrc = presetImages[preset.name];
              return (
                <button
                  key={preset.name}
                  onClick={() => handleAdd(preset)}
                  disabled={isAdded}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    isAdded
                      ? "bg-accent/10 border-accent/30"
                      : "bg-card border-border/40 hover:border-accent/50"
                  )}
                >
                  <div className="aspect-square rounded-xl bg-muted flex items-center justify-center mb-2 overflow-hidden">
                    {imgSrc ? (
                      <img src={imgSrc} alt={preset.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👕</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{preset.name}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.color} · {preset.fabric}</p>
                  {isAdded && (
                    <div className="flex items-center gap-1 mt-1 text-accent">
                      <Check className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Added</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
