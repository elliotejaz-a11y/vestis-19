import { ClothingCard } from "@/components/ClothingCard";
import { AddClothingSheet } from "@/components/AddClothingSheet";
import { ClothingItem, CATEGORIES } from "@/types/wardrobe";
import { Plus, Shirt } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  items: ClothingItem[];
  onAdd: (item: ClothingItem) => void;
  onRemove: (id: string) => void;
}

export function Wardrobe({ items, onAdd, onRemove }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = activeFilter === "all" ? items : items.filter((i) => i.category === activeFilter);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Wardrobe</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{items.length} pieces</p>
      </header>

      {/* Category filters */}
      <div className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
            activeFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveFilter(cat.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              activeFilter === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border"
            )}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
            <Shirt className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Your wardrobe is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            Add your first piece by tapping the + button below
          </p>
          <AddClothingSheet onAdd={onAdd}>
            <button className="mt-4 px-5 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Clothing
            </button>
          </AddClothingSheet>
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <ClothingCard key={item.id} item={item} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Wardrobe;
