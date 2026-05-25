import { useState, useMemo, useCallback, memo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ClothingItem } from "@/types/wardrobe";
import { CATALOG_ITEMS, CATALOG_COLORS, CatalogItem } from "@/data/clothingCatalog";
import { cn } from "@/lib/utils";
import { Search, Plus, Check, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Category tabs ────────────────────────────────────────────
const CAT_TABS = [
  { value: "all",         label: "All",        icon: "✨" },
  { value: "tops",        label: "Tops",        icon: "👕" },
  { value: "bottoms",     label: "Bottoms",     icon: "👖" },
  { value: "dresses",     label: "Dresses",     icon: "👗" },
  { value: "outerwear",   label: "Outerwear",   icon: "🧥" },
  { value: "shoes",       label: "Shoes",       icon: "👟" },
  { value: "hats",        label: "Hats",        icon: "🧢" },
  { value: "accessories", label: "Accessories", icon: "👜" },
] as const;

// ─── Fallback emoji per category ─────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  tops: "👕", bottoms: "👖", dresses: "👗", outerwear: "🧥",
  shoes: "👟", hats: "🧢", accessories: "👜",
};

// ─── Individual catalog card ──────────────────────────────────
interface CardProps {
  item: CatalogItem;
  onAdd: (item: CatalogItem, color: string) => void;
}

const CatalogCard = memo(function CatalogCard({ item, onAdd }: CardProps) {
  const [selectedColor, setSelectedColor] = useState(item.defaultColor);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = useMemo(() => {
    if (imgError) return null;
    return item.colorImageUrls[selectedColor] ?? item.imageUrl;
  }, [item, selectedColor, imgError]);

  const colorHex = useMemo(
    () => CATALOG_COLORS.find((c) => c.name === selectedColor)?.hex ?? "#888",
    [selectedColor],
  );

  const handleAdd = useCallback(() => {
    onAdd(item, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }, [item, selectedColor, onAdd]);

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden flex flex-col">
      {/* ── Image ── */}
      <div className="relative aspect-[3/4] bg-muted flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-30">
              {CAT_EMOJI[item.category] ?? "👕"}
            </span>
          </div>
        )}
        {/* Selected-colour indicator dot */}
        <div
          className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 transition-colors"
          style={{ backgroundColor: colorHex }}
          title={selectedColor}
        />
      </div>

      {/* ── Label ── */}
      <div className="px-2.5 pt-2 pb-1">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">
          {item.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{item.style}</p>
      </div>

      {/* ── Colour swatches ── */}
      <div className="px-2.5 pb-2 mt-auto">
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {CATALOG_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => setSelectedColor(color.name)}
              title={color.name}
              aria-label={color.name}
              aria-pressed={selectedColor === color.name}
              className={cn(
                "w-4 h-4 rounded-full border shrink-0 transition-all duration-100",
                selectedColor === color.name
                  ? "border-accent scale-125 shadow-sm"
                  : "border-border/50 hover:scale-110",
              )}
              style={{
                backgroundColor: color.hex,
                // Show a subtle stroke on very light colours
                outline: color.hex === "#FFFFFF" ? "1px solid #e5e7eb" : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Add button ── */}
      <div className="px-2.5 pb-2.5 flex justify-end">
        <button
          onClick={handleAdd}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150",
            added
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-95",
          )}
        >
          {added ? (
            <><Check className="w-3 h-3" /> Added</>
          ) : (
            <><Plus className="w-3 h-3" /> Add</>
          )}
        </button>
      </div>
    </div>
  );
});

// ─── Main sheet ───────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    item: ClothingItem,
    options?: { runBackgroundRemoval?: boolean },
  ) => Promise<void> | void;
}

export function CatalogBrowserSheet({ open, onOpenChange, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let items = CATALOG_ITEMS;
    if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.style.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [search, activeCategory]);

  const handleAdd = useCallback(
    async (catalogItem: CatalogItem, color: string) => {
      const imageUrl =
        catalogItem.colorImageUrls[color] ?? catalogItem.imageUrl;

      const wardrobeItem: ClothingItem = {
        id: crypto.randomUUID(),
        name: catalogItem.name,
        category: catalogItem.category,
        color,
        fabric: catalogItem.fabric,
        imageUrl,
        tags: [...catalogItem.tags, color.toLowerCase()],
        notes: `From catalog · ${catalogItem.style}`,
        addedAt: new Date(),
        imageStatus: "ready",
      };

      await onAdd(wardrobeItem);
      toast({ title: `Added ${catalogItem.name}` });
    },
    [onAdd, toast],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] rounded-t-3xl bg-background flex flex-col p-0 overflow-hidden"
        style={{ zIndex: 10001 }}
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-6 pb-2 shrink-0">
          <SheetTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            Browse Catalog
          </SheetTitle>
        </SheetHeader>

        {/* ── Search ── */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, style or type…"
              className="pl-9 rounded-xl bg-card border-border/60 text-sm"
            />
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div className="px-5 pb-3 shrink-0 flex gap-2 overflow-x-auto no-scrollbar">
          {CAT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                activeCategory === tab.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-accent/40",
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Count ── */}
        {filtered.length > 0 && (
          <p className="px-5 pb-2 shrink-0 text-xs text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Grid ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No items found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term or category
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((item) => (
                <CatalogCard key={item.id} item={item} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
