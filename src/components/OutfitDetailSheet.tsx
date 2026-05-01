import { Outfit, ClothingItem } from "@/types/wardrobe";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Lightbulb, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useMemo } from "react";
import {
  sortByLayerOrder,
  getLayerLabel,
  LEFT_CATEGORIES,
  RIGHT_CATEGORIES,
  CENTRE_CATEGORIES,
} from "@/lib/outfitLayerOrder";

interface Props {
  outfit: Outfit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SideItemCard({ item }: { item: ClothingItem }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/30 p-2 flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 rounded-lg bg-white dark:bg-neutral-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
      </div>
      <div className="text-center w-full min-w-0">
        <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">{item.name}</p>
        <span className="text-[9px] text-accent font-medium block">{getLayerLabel(item.category)}</span>
      </div>
    </div>
  );
}

function CentreItemCard({ item }: { item: ClothingItem }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/30 overflow-hidden">
      <div className="w-14 h-14 rounded-lg bg-white dark:bg-neutral-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <span className="text-[10px] text-accent font-medium">{getLayerLabel(item.category)}</span>
        {item.color && (
          <p className="text-xs text-muted-foreground truncate">{item.color}</p>
        )}
        {item.fabric && (
          <p className="text-[11px] text-muted-foreground truncate">{item.fabric}</p>
        )}
      </div>
    </div>
  );
}

export function OutfitDetailSheet({ outfit, open, onOpenChange }: Props) {
  if (!outfit) return null;

  const sorted = useMemo(() => sortByLayerOrder(outfit.items), [outfit.items]);

  const leftItems = sorted.filter(item => LEFT_CATEGORIES.has((item.category || "").toLowerCase()));
  const centreItems = sorted.filter(item => CENTRE_CATEGORIES.has((item.category || "").toLowerCase()));
  const rightItems = sorted.filter(item => RIGHT_CATEGORIES.has((item.category || "").toLowerCase()));
  const uncategorised = sorted.filter(item => {
    const cat = (item.category || "").toLowerCase();
    return !LEFT_CATEGORIES.has(cat) && !RIGHT_CATEGORIES.has(cat) && !CENTRE_CATEGORIES.has(cat);
  });
  const allCentreItems = [...centreItems, ...uncategorised];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-background" style={{ paddingBottom: '6rem', zIndex: 10000 }}>
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

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>Created {format(new Date(outfit.createdAt), "d MMM yyyy")}</span>
        </div>

        {outfit.description && (
          <p className="text-sm text-foreground leading-relaxed mb-4">{outfit.description}</p>
        )}

        {/* Three-column outfit item layout */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items in this outfit</p>

          <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 items-stretch">

            {/* Left column: outerwear + top layer */}
            <div className="flex flex-col gap-2 justify-center">
              {leftItems.map(item => (
                <SideItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Centre column: core worn items top-to-bottom */}
            <div className="flex flex-col gap-2">
              {allCentreItems.map(item => (
                <CentreItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* Right column: accessories */}
            <div className="flex flex-col gap-2 justify-center">
              {rightItems.map(item => (
                <SideItemCard key={item.id} item={item} />
              ))}
            </div>

          </div>
        </div>

        {outfit.reasoning && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Why this works</p>
            <p className="text-sm text-foreground leading-relaxed">{outfit.reasoning}</p>
          </div>
        )}

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
