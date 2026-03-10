import { ClothingItem } from "@/types/wardrobe";

const CATEGORY_ORDER = ["shoes", "bottoms", "dresses", "tops", "jumpers", "outerwear", "accessories"];

/**
 * Position & size config for each category in the flat-lay.
 * Coordinates are percentages of the container.
 * Items layer bottom→top following CATEGORY_ORDER (shoes behind, accessories on top).
 */
const FLAT_LAY_LAYOUT: Record<string, { top: string; left: string; width: string; zIndex: number }> = {
  jumpers:     { top: "24%", left: "50%", width: "52%", zIndex: 1 },
  outerwear:   { top: "22%", left: "50%", width: "48%", zIndex: 1 },
  tops:        { top: "22%", left: "50%", width: "48%", zIndex: 2 },
  dresses:     { top: "38%", left: "50%", width: "50%", zIndex: 2 },
  bottoms:     { top: "52%", left: "50%", width: "48%", zIndex: 3 },
  shoes:       { top: "82%", left: "50%", width: "26%", zIndex: 4 },
  accessories: { top: "4%",  left: "50%", width: "20%", zIndex: 4 },
};

function sortForFlatLay(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.category);
    const bIdx = CATEGORY_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}

interface Props {
  items: ClothingItem[];
  /** Container height in px — defaults to 260 */
  height?: number;
}

export function OutfitFlatLay({ items, height = 260 }: Props) {
  const sorted = sortForFlatLay(items);

  // When there's no dress, shift bottoms up a bit for a tighter composition
  const hasDress = sorted.some((i) => i.category === "dresses");
  const hasTop = sorted.some((i) => i.category === "tops");
  const hasJumper = sorted.some((i) => i.category === "jumpers");

  return (
    <div
      className="relative w-full bg-white dark:bg-neutral-800 overflow-hidden"
      style={{ height }}
    >
      {sorted.map((item) => {
        const base = FLAT_LAY_LAYOUT[item.category] || FLAT_LAY_LAYOUT.tops;
        let { top, left, width, zIndex } = base;

        // Dynamic adjustments for better composition
        if (item.category === "bottoms" && !hasDress) {
          top = "44%";
        }
        if (item.category === "tops" && hasJumper) {
          // Shift top slightly right when jumper present
          left = "56%";
        }
        if (item.category === "outerwear" && !hasTop && !hasJumper) {
          // Center outerwear if no top/jumper
          left = "50%";
        }

        return (
          <div
            key={item.id}
            className="absolute"
            style={{
              top,
              left,
              width,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              zIndex,
            }}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-contain drop-shadow-md"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}
