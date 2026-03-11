import { Outfit } from "@/types/wardrobe";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Lightbulb, Calendar } from "lucide-react";
import { format } from "date-fns";
import { sortItemsHeadToToe, ITEM_MAX_SIZE } from "@/lib/outfit-display";
import { cn } from "@/lib/utils";

interface Props {
  outfit: Outfit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  tops: "👕 Top",
  bottoms: "👖 Bottom",
  dresses: "👗 Dress",
  jumpers: "🧶 Jumper",
  outerwear: "🧥 Outerwear",
  shoes: "👟 Shoes",
  accessories: "👜 Accessory",
};

export function OutfitDetailSheet({ outfit, open, onOpenChange }: Props) {
  if (!outfit) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-lg font-bold">
            {outfit.name || outfit.occasion}
          </SheetTitle>
          {outfit.name && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs text-muted-foreground">{outfit.occasion}</span>
            </div>
          )}
        </SheetHeader>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>Created {format(new Date(outfit.createdAt), "d MMM yyyy")}</span>
        </div>

        {/* Description */}
        {outfit.description && (
          <p className="text-sm text-foreground leading-relaxed mb-4">{outfit.description}</p>
        )}

        {/* Head-to-toe preview */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 mb-4 h-72 overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full gap-y-1">
            {sortItemsHeadToToe(outfit.items).map((item) => {
              const sizeClass = ITEM_MAX_SIZE[item.category] || "max-w-24";
              return (
                <div key={item.id} className={cn("flex-shrink min-h-0", sizeClass)}>
                  <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain drop-shadow-sm mx-auto" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Items breakdown */}
        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items in this outfit</p>
          <div className="space-y-2">
            {sortItemsHeadToToe(outfit.items).map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                <div className="w-14 h-14 rounded-lg bg-white dark:bg-neutral-800 flex-shrink-0 overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[item.category] || item.category}
                    {item.color ? ` · ${item.color}` : ""}
                  </p>
                  {item.fabric && (
                    <p className="text-[11px] text-muted-foreground">{item.fabric}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI reasoning */}
        {outfit.reasoning && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Why this works</p>
            <p className="text-sm text-foreground leading-relaxed">{outfit.reasoning}</p>
          </div>
        )}

        {/* Style tips */}
        {outfit.styleTips && (
          <div className="flex items-start gap-2 bg-accent/10 rounded-xl p-3">
            <Lightbulb className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">Style Tip</p>
              <p className="text-xs text-foreground leading-relaxed">{outfit.styleTips}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
