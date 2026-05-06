import { useState, useMemo, useRef, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ClothingCard } from "@/components/ClothingCard";
import { ClothingDetailSheet } from "@/components/ClothingDetailSheet";
import { WardrobeAddButton } from "@/components/WardrobeAddButton";
import { OutfitCard } from "@/components/OutfitCard";

import { ClothingItem, Outfit, CATEGORIES } from "@/types/wardrobe";
import { Plus, Shirt, Bookmark, Sparkles, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  items: ClothingItem[];
  outfits: Outfit[];
  onAdd: (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => void;
  onAddDuplicated?: (item: ClothingItem) => void;
  onRemove: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
  onSaveOutfit?: (id: string, saved: boolean, name?: string, description?: string) => void;
  onDeleteOutfit?: (id: string) => void;
  onRetryBackgroundRemoval?: (id: string) => void;
  dataReady?: boolean;
}

const COLS = 2;
// Estimated row height: card aspect-ratio 3/4 at ~165px wide + 52px label + 12px gap
const ROW_HEIGHT = 290;
// Only virtualize for larger wardrobes — small lists aren't worth the overhead
const VIRTUALIZE_THRESHOLD = 30;

export function Wardrobe({ items, outfits, onAdd, onAddDuplicated, onRemove, onUpdate, onSaveOutfit, onDeleteOutfit, onRetryBackgroundRemoval, dataReady }: Props) {
  const [activeTab, setActiveTab] = useState<"outfits" | "clothes">("clothes");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);

  const savedOutfits = useMemo(() => outfits.filter((o) => o.saved), [outfits]);
  const filteredBase = useMemo(
    () => (activeFilter === "all" ? items : items.filter((i) => i.category === activeFilter)),
    [items, activeFilter]
  );
  const filtered = useMemo(() => {
    const copy = [...filteredBase];
    copy.sort((a, b) =>
      sortBy === "oldest"
        ? a.addedAt.getTime() - b.addedAt.getTime()
        : b.addedAt.getTime() - a.addedAt.getTime()
    );
    return copy;
  }, [filteredBase, sortBy]);

  const numRows = Math.ceil(filtered.length / COLS);
  const useVirtualGrid = filtered.length >= VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useWindowVirtualizer({
    count: useVirtualGrid ? numRows : 0,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
    scrollMargin: gridRef.current?.offsetTop ?? 0,
  });

  const handleDetail = useCallback((item: ClothingItem) => setDetailItem(item), []);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wardrobe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{items.length} pieces · {savedOutfits.length} saved outfits</p>
      </header>

      {/* Main tabs */}
      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("clothes")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            activeTab === "clothes" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          <Shirt className="w-3.5 h-3.5" /> My Clothes
        </button>
        <button
          onClick={() => setActiveTab("outfits")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            activeTab === "outfits" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          <Bookmark className="w-3.5 h-3.5" /> Saved Outfits
        </button>
      </div>

      {activeTab === "outfits" ? (
        /* Saved Outfits Tab */
        <div className="px-5 space-y-3">
          {savedOutfits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
                <Bookmark className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No saved outfits yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">Generate outfits with AI or build your own, then save your favorites</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/outfits")}
                  className="px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generate
                </button>
                <button
                  onClick={() => navigate("/builder")}
                  className="px-5 py-2 rounded-full bg-card text-foreground text-xs font-semibold border border-border flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Build
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {savedOutfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} onSave={onSaveOutfit} onDelete={onDeleteOutfit} compact />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Clothes Tab */
        <>
          <div className="px-5 pb-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{filtered.length} items</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-auto h-auto px-4 py-1.5 rounded-full bg-card text-xs font-medium border border-border gap-1.5">
                <ArrowUpDown className="w-3 h-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest to Oldest</SelectItem>
                <SelectItem value="oldest">Oldest to Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                activeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
              )}
            >All</button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveFilter(cat.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                  activeFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                )}
              >{cat.icon} {cat.label}</button>
            ))}
          </div>

          {filtered.length === 0 && dataReady ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
                <Shirt className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Your wardrobe is empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Add your first piece by tapping the + button below</p>
              <WardrobeAddButton onAdd={onAdd}>
                <button className="mt-4 px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Clothing
                </button>
              </WardrobeAddButton>
            </div>
          ) : useVirtualGrid ? (
            /* Virtualized grid — only rendered for wardrobes with 30+ items */
            <div
              ref={gridRef}
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * COLS;
                const rowItems = filtered.slice(startIdx, startIdx + COLS);
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: `${virtualRow.start - (gridRef.current?.offsetTop ?? 0)}px`,
                      left: 0,
                      right: 0,
                      height: `${virtualRow.size}px`,
                    }}
                    className="grid grid-cols-2 gap-3 px-4"
                  >
                    {rowItems.map((item) => (
                      <ClothingCard
                        key={item.id}
                        item={item}
                        onRemove={onRemove}
                        onDetail={handleDetail}
                        onRetryBackgroundRemoval={onRetryBackgroundRemoval}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Small wardrobe — plain grid, no virtualizer overhead */
            <div className="px-4 grid grid-cols-2 gap-3">
              {filtered.map((item) => (
                <ClothingCard
                  key={item.id}
                  item={item}
                  onRemove={onRemove}
                  onDetail={handleDetail}
                  onRetryBackgroundRemoval={onRetryBackgroundRemoval}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Always-visible floating add button */}
      <WardrobeAddButton onAdd={onAdd}>
        <button className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </WardrobeAddButton>

      <ClothingDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        onSave={onUpdate}
        onRemove={onRemove}
        onDuplicated={(newItem) => { setDetailItem(null); onAddDuplicated?.(newItem); }}
      />
    </div>
  );
}

export default Wardrobe;
