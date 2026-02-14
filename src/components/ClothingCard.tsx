import { ClothingItem } from "@/types/wardrobe";
import { Info, X } from "lucide-react";

interface Props {
  item: ClothingItem;
  onRemove?: (id: string) => void;
  onDetail?: (item: ClothingItem) => void;
  compact?: boolean;
}

export function ClothingCard({ item, onRemove, onDetail, compact }: Props) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div
        className={`${compact ? "aspect-square" : "aspect-[3/4]"} bg-white cursor-pointer`}
        onClick={() => onDetail?.(item)}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold truncate text-foreground">{item.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{item.category} · {item.color}</p>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDetail && (
          <button
            onClick={() => onDetail(item)}
            className="w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
          >
            <Info className="w-3 h-3 text-foreground" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
