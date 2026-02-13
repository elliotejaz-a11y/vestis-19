import { ClothingItem } from "@/types/wardrobe";
import { X } from "lucide-react";

interface Props {
  item: ClothingItem;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export function ClothingCard({ item, onRemove, compact }: Props) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className={compact ? "aspect-square" : "aspect-[3/4]"}>
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{item.category} · {item.color}</p>
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5 text-foreground" />
        </button>
      )}
    </div>
  );
}
