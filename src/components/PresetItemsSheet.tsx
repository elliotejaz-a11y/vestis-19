import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ClothingItem, CATEGORIES, PRESET_ITEMS, ClothingCategory } from "@/types/wardrobe";
import { PresetClothingSvg } from "@/components/PresetClothingSvg";
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
    const key = preset.name;
    if (added.has(key)) return;

    // Create a canvas to render the SVG as an image
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw white/transparent background
    ctx.clearRect(0, 0, 400, 400);

    const item: ClothingItem = {
      id: crypto.randomUUID(),
      name: preset.name,
      category: preset.category,
      color: preset.color,
      fabric: preset.fabric,
      imageUrl: "", // Will be set as SVG data URL
      tags: [...preset.tags, preset.color.toLowerCase(), preset.fabric.toLowerCase()],
      notes: "Added from presets",
      addedAt: new Date(),
      estimatedPrice: undefined,
    };

    // Generate SVG data URL for the image
    const svgContent = generateSvgDataUrl(preset.svgIcon, preset.color);
    item.imageUrl = svgContent;

    onAdd(item);
    setAdded((prev) => new Set(prev).add(key));
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
                  <div className="aspect-square rounded-xl bg-white flex items-center justify-center mb-2 overflow-hidden">
                    <PresetClothingSvg svgIcon={preset.svgIcon} color={preset.color} className="w-3/4 h-3/4" />
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

function generateSvgDataUrl(svgIcon: string, color: string): string {
  const COLOR_MAP: Record<string, string> = {
    Black: "#1a1a1a", White: "#f5f5f5", Navy: "#1e3a5f", Beige: "#d4c5a9",
    Brown: "#6b4226", Red: "#c0392b", Blue: "#2980b9", Green: "#27ae60",
    Pink: "#e91e8e", Gray: "#7f8c8d", Burgundy: "#6b2737", Olive: "#556b2f",
    Cream: "#fffdd0", Tan: "#d2b48c", Charcoal: "#36454f",
  };
  const fill = COLOR_MAP[color] || "#888";
  const stroke = color === "White" || color === "Cream" ? "#ccc" : "none";

  const paths: Record<string, string> = {
    tshirt: `<path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 30 L40 30 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    polo: `<path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 28 L55 35 L50 28 L45 35 L40 28 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    buttondown: `<path d="M30 15 L20 25 L10 20 L20 50 L30 45 L30 90 L70 90 L70 45 L80 50 L90 20 L80 25 L70 15 L58 25 L42 25 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    hoodie: `<path d="M30 20 L20 30 L8 25 L18 55 L30 48 L30 88 L70 88 L70 48 L82 55 L92 25 L80 30 L70 20 L60 30 L40 30 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    breton: `<path d="M30 20 L20 30 L10 25 L20 50 L30 45 L30 85 L70 85 L70 45 L80 50 L90 25 L80 30 L70 20 L60 30 L40 30 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    jeans: `<path d="M25 10 L25 50 L20 90 L45 90 L50 55 L55 90 L80 90 L75 50 L75 10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    chinos: `<path d="M27 10 L27 50 L22 90 L46 90 L50 55 L54 90 L78 90 L73 50 L73 10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    trousers: `<path d="M27 10 L27 50 L22 90 L46 90 L50 55 L54 90 L78 90 L73 50 L73 10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    joggers: `<path d="M25 10 Q24 50 28 90 L45 90 Q50 60 50 55 Q50 60 55 90 L72 90 Q76 50 75 10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    dress: `<path d="M40 10 L35 25 L25 90 L75 90 L65 25 L60 10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    jacket: `<path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 90 L48 90 L48 30 L52 30 L52 90 L72 90 L72 48 L85 55 L92 20 L82 25 L70 15 L58 25 L42 25 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    blazer: `<path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 90 L72 90 L72 48 L85 55 L92 20 L82 25 L70 15 L58 25 L50 40 L42 25 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    trench: `<path d="M28 12 L15 22 L5 18 L12 55 L26 48 L26 92 L74 92 L74 48 L88 55 L95 18 L85 22 L72 12 L58 22 L50 35 L42 22 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    puffer: `<path d="M30 15 L18 25 L8 20 L15 55 L28 48 L28 88 L72 88 L72 48 L85 55 L92 20 L82 25 L70 15 L60 25 L40 25 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    sneakers: `<path d="M15 55 L15 70 L85 70 L85 50 L70 40 L50 38 L30 42 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/><path d="M15 70 L15 75 L90 75 L90 70 Z" fill="#ddd"/>`,
    dressshoes: `<path d="M20 50 L20 65 L85 65 L90 55 L70 42 L35 42 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    boots: `<path d="M30 20 L30 65 L15 65 L15 80 L75 80 L75 65 L60 65 L60 20 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    heels: `<path d="M25 30 L25 55 L15 55 L15 65 L60 65 L65 55 L40 55 L50 30 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
    belt: `<rect x="5" y="40" width="90" height="12" rx="3" fill="${fill}"/><rect x="42" y="37" width="16" height="18" rx="2" fill="#c0c0c0"/>`,
    watch: `<circle cx="50" cy="50" r="20" fill="#e0e0e0" stroke="${fill}" stroke-width="3"/><circle cx="50" cy="50" r="16" fill="white"/>`,
    sunglasses: `<ellipse cx="32" cy="50" rx="18" ry="14" fill="${fill}"/><ellipse cx="68" cy="50" rx="18" ry="14" fill="${fill}"/>`,
    scarf: `<path d="M30 15 Q50 5 70 15 Q75 30 70 50 L65 80 L60 85 L55 80 L50 50 Q45 30 30 15 Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`,
  };

  const path = paths[svgIcon] || paths.tshirt;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400"><rect width="100" height="100" fill="white"/>${path}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
