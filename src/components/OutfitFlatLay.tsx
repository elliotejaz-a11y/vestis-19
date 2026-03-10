import { ClothingItem } from "@/types/wardrobe";

const CATEGORY_ORDER = ["shoes", "bottoms", "dresses", "tops", "jumpers", "outerwear", "accessories"];

/**
 * Returns z-index, marginTop (as top%), left%, and width% for a given category.
 * Lower z-index = further back; higher = closer to viewer.
 */
function getLayerClass(category: string): { top: string; left: string; width: string; zIndex: number } {
  switch (category) {
    case "jumpers":
      return { top: "24%", left: "50%", width: "52%", zIndex: 1 };
    case "outerwear":
      return { top: "22%", left: "50%", width: "48%", zIndex: 1 };
    case "tops":
      return { top: "22%", left: "50%", width: "48%", zIndex: 2 };
    case "dresses":
      return { top: "38%", left: "50%", width: "50%", zIndex: 2 };
    case "bottoms":
      return { top: "52%", left: "50%", width: "48%", zIndex: 3 };
    case "shoes":
      return { top: "82%", left: "50%", width: "26%", zIndex: 4 };
    case "accessories":
      return { top: "4%",  left: "50%", width: "20%", zIndex: 4 };
    default:
      return { top: "22%", left: "50%", width: "48%", zIndex: 2 };
  }
}

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

  const has = (cat: string) => sorted.some((i) => i.category === cat);
  const hasDress = has("dresses");
  const hasTop = has("tops");
  const hasJumper = has("jumpers");
  const hasOuterwear = has("outerwear");
  const hasBottoms = has("bottoms");
  const hasShoes = has("shoes");
  const hasAccessories = has("accessories");

  // Whether there's a torso piece at all
  const hasTorso = hasTop || hasJumper || hasOuterwear || hasDress;

  return (
    <div
      className="relative w-full bg-white dark:bg-neutral-800 overflow-hidden"
      style={{ height }}
    >
      {sorted.map((item) => {
        const base = getLayerClass(item.category);
        let { top, left, width, zIndex } = base;

        // ── Adaptive spacing to maintain silhouette ──

        // Accessories: push down if no torso above
        if (item.category === "accessories" && !hasTorso) {
          top = "12%";
        }

        // Tops + Jumpers layering
        if (item.category === "tops" && hasJumper) {
          top = "20%";
        }
        if (item.category === "jumpers" && hasTop) {
          top = "28%";
        }

        // No top/jumper → pull bottoms up to close the gap
        if (item.category === "bottoms") {
          if (!hasTorso) {
            top = "32%";
          } else if (hasDress) {
            top = "58%";
          }
        }

        // Dress without bottoms → stretch lower
        if (item.category === "dresses" && !hasBottoms) {
          top = "42%";
          width = "52%";
        }

        // Shoes: pull up if no bottoms to close gap
        if (item.category === "shoes" && !hasBottoms && !hasDress) {
          top = "68%";
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
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12)) drop-shadow(0 1px 3px rgba(0,0,0,0.06))",
            }}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-contain"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}
