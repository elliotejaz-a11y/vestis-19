import { Outfit, ClothingItem } from "@/types/wardrobe";
import { Sparkles, Lightbulb, Bookmark, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = ["accessories", "outerwear", "tops", "dresses", "bottoms", "shoes"];

function sortItemsForFlatLay(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}

interface Props {
  outfit: Outfit;
  onSave?: (id: string, saved: boolean) => void;
  onDelete?: (id: string) => void;
  onChat?: (outfit: Outfit) => void;
  compact?: boolean;
}

export function OutfitCard({ outfit, onSave, onDelete, onChat, compact }: Props) {
  const sorted = sortItemsForFlatLay(outfit.items);

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm">
      {/* Flat-lay outfit display */}
      <div className="bg-white p-4">
        <div className="flex flex-col items-center gap-1">
          {sorted.map((item) => {
            const isShoes = item.category === "shoes";
            const isAccessory = item.category === "accessories";
            const size = isShoes || isAccessory ? "w-16 h-16" : "w-24 h-24";
            return (
              <div key={item.id} className={cn("flex-shrink-0", size)}>
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Info section */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-foreground">{outfit.occasion}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {onChat && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChat(outfit)}>
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
            {onSave && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSave(outfit.id, !outfit.saved)}>
                <Bookmark className={cn("w-3.5 h-3.5", outfit.saved ? "fill-accent text-accent" : "text-muted-foreground")} />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(outfit.id)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        {!compact && (
          <>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{outfit.reasoning}</p>
            {outfit.styleTips && (
              <div className="flex items-start gap-1.5 bg-accent/10 rounded-xl p-2">
                <Lightbulb className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-foreground leading-relaxed">{outfit.styleTips}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
