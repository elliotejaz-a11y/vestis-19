import { useMemo } from "react";
import { ClothingItem } from "@/types/wardrobe";
import { cn } from "@/lib/utils";
import { sortByLayerOrder, LEFT_CATEGORIES, RIGHT_CATEGORIES, CENTRE_CATEGORIES } from "@/lib/outfitLayerOrder";

interface Props {
  items: ClothingItem[];
  showHeader?: boolean;
  className?: string;
  canvasClassName?: string;
}

function CollageItem({ item }: { item: ClothingItem }) {
  return (
    <div className="flex-1 flex items-center justify-center w-full min-h-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="max-h-full max-w-full object-contain drop-shadow-sm"
        loading="lazy"
      />
    </div>
  );
}

export function OutfitCollagePreview({ items, showHeader = false, className, canvasClassName }: Props) {
  const sorted = useMemo(() => sortByLayerOrder(items), [items]);

  const leftItems = sorted.filter(item => LEFT_CATEGORIES.has((item.category || "").toLowerCase()));
  const centreItems = sorted.filter(item => CENTRE_CATEGORIES.has((item.category || "").toLowerCase()));
  const rightItems = sorted.filter(item => RIGHT_CATEGORIES.has((item.category || "").toLowerCase()));
  // Uncategorised items fall into centre so nothing is lost
  const uncategorised = sorted.filter(item => {
    const cat = (item.category || "").toLowerCase();
    return !LEFT_CATEGORIES.has(cat) && !RIGHT_CATEGORIES.has(cat) && !CENTRE_CATEGORIES.has(cat);
  });
  const allCentreItems = [...centreItems, ...uncategorised];

  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <p className="text-xs font-semibold text-foreground">Your Outfit ({items.length} pieces)</p>
      )}

      <div className={cn("rounded-xl bg-muted/20 overflow-hidden", canvasClassName || "h-[300px]")}>
        <div className="grid grid-cols-[1fr_2fr_1fr] h-full p-3 gap-2">

          {/* Left column: outerwear + top layer, centred beside the torso */}
          <div className="flex flex-col items-center justify-center gap-2 h-full">
            {leftItems.map(item => (
              <CollageItem key={item.id} item={item} />
            ))}
          </div>

          {/* Centre column: core items in strict top-to-bottom worn order */}
          <div className="flex flex-col items-center justify-evenly gap-1 h-full">
            {allCentreItems.map(item => (
              <CollageItem key={item.id} item={item} />
            ))}
          </div>

          {/* Right column: accessories, centred beside the torso */}
          <div className="flex flex-col items-center justify-center gap-2 h-full">
            {rightItems.map(item => (
              <CollageItem key={item.id} item={item} />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
