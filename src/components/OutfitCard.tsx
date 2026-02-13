import { Outfit } from "@/types/wardrobe";
import { Sparkles } from "lucide-react";

interface Props {
  outfit: Outfit;
}

export function OutfitCard({ outfit }: Props) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">{outfit.occasion}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {outfit.items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-20">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">{item.name}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{outfit.reasoning}</p>
    </div>
  );
}
