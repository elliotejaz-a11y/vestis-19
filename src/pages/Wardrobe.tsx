import { useState } from "react";
import { ClothingCard } from "@/components/ClothingCard";
import { ClothingDetailSheet } from "@/components/ClothingDetailSheet";
import { AddClothingSheet } from "@/components/AddClothingSheet";
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
  onRemove: (id: string) => void;
  onUpdate: (item: ClothingItem) => void;
  onSaveOutfit?: (id: string, saved: boolean, name?: string, description?: string) => void;
  onDeleteOutfit?: (id: string) => void;
  onRetryBackgroundRemoval?: (id: string) => void;
}

export function Wardrobe({ items, outfits, onAdd, onRemove, onUpdate, onSaveOutfit, onDeleteOutfit, onRetryBackgroundRemoval }: Props) {
  const [activeTab, setActiveTab] = useState<"outfits" | "clothes">("clothes");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [detailItem, setDetailItem] = useState<ClothingItem | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "color" | "fabric">("newest");
  const navigate = useNavigate();

  const savedOutfits = outfits.filter((o) => o.saved);
  const filtered = activeFilter === "all" ? items : items.filter((i) => i.category === activeFilter);

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === "color") return (a.color || "").localeCompare(b.color || "");
    if (sortBy === "fabric") return (a.fabric || "").localeCompare(b.fabric || "");
    return b.addedAt.getTime() - a.addedAt.getTime();
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wardrobe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{items.length} pieces · {savedOutfits.length} saved outfits</p>
      </header>

      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("clothes")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            activeTab === "clothes" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          <Shirt className="w-3.5 h-3.5" /> My Clothes
        </button>
        <button
          onClick={() => setActiveTab("outfits")}
          className={cn(
            "flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            activeTab === "outfits" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground border border-border"
          )}
        >
          <Bookmark className="w-3.5 h-3.5" /> Saved Outfits
        </button>
      </div>

      {activeTab === "outfits" ? (
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
        <>
          <div className="px-5 pb-2 flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-8 rounded-xl bg-card text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Added</SelectItem>
                <SelectItem value="color">Colour</SelectItem>
                <SelectItem value="fabric">Material</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
              )}
            >All</button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveFilter(cat.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  activeFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                )}
              >{cat.icon} {cat.label}</button>
            ))}
          </div>

          {sortedFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
                <Shirt className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Your wardrobe is empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Add your first piece by tapping the + button below</p>
              <AddClothingSheet onAdd={onAdd}>
                <button className="mt-4 px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Clothing
                </button>
              </AddClothingSheet>
            </div>
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3">
              {sortedFiltered.map((item) => (
                <ClothingCard key={item.id} item={item} onRemove={onRemove} onDetail={setDetailItem} onRetryBackgroundRemoval={onRetryBackgroundRemoval} />
              ))}
            </div>
          )}
        </>
      )}

      <AddClothingSheet onAdd={onAdd}>
        <button className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </AddClothingSheet>

      <ClothingDetailSheet
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(o) => { if (!o) setDetailItem(null); }}
        onSave={onUpdate}
        onRemove={onRemove}
        onDuplicated={() => { setDetailItem(null); window.location.reload(); }}
      />
    </div>
  );
}

export default Wardrobe;
