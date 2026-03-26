import { ClothingItem } from "@/types/wardrobe";
import { cn } from "@/lib/utils";

type Layout = { x: number; y: number; w: number; h: number; z: number };

const CATEGORY_ORDER = ["hats", "accessories", "outerwear", "jumpers", "tops", "dresses", "bottoms", "shoes"];

const BASE_LAYOUT: Record<string, Layout> = {
  hats: { x: 56, y: 16, w: 64, h: 64, z: 50 },
  accessories: { x: 78, y: 42, w: 58, h: 58, z: 45 },
  outerwear: { x: 36, y: 34, w: 130, h: 130, z: 30 },
  jumpers: { x: 36, y: 34, w: 130, h: 130, z: 29 },
  tops: { x: 52, y: 36, w: 112, h: 112, z: 35 },
  dresses: { x: 50, y: 52, w: 118, h: 146, z: 26 },
  bottoms: { x: 50, y: 70, w: 122, h: 148, z: 24 },
  shoes: { x: 60, y: 88, w: 80, h: 80, z: 20 },
};

const SPREAD = [-8, 0, 8, -14, 14];

interface Props {
  items: ClothingItem[];
  showHeader?: boolean;
  className?: string;
  canvasClassName?: string;
}

function sortItems(items: ClothingItem[]) {
  return [...items].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf((a.category || "").toLowerCase());
    const bIdx = CATEGORY_ORDER.indexOf((b.category || "").toLowerCase());
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}

export function OutfitCollagePreview({ items, showHeader = false, className, canvasClassName }: Props) {
  const sorted = sortItems(items);
  const countByCategory: Record<string, number> = {};

  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <p className="text-xs font-semibold text-foreground">Your Outfit ({items.length} pieces)</p>
      )}

      <div className={cn("relative overflow-hidden rounded-xl bg-muted/20", canvasClassName || "h-[300px]")}>
        {sorted.map((item, idx) => {
          const category = (item.category || "").toLowerCase();
          const base = BASE_LAYOUT[category] || { x: 20 + (idx % 4) * 18, y: 20 + Math.floor(idx / 4) * 22, w: 80, h: 80, z: 10 };
          const catIndex = countByCategory[category] || 0;
          countByCategory[category] = catIndex + 1;

          const spread = SPREAD[catIndex % SPREAD.length];
          const x = base.x + spread;
          const y = base.y + (catIndex > 0 ? 4 : 0);
          const scale = catIndex > 0 ? 0.9 : 1;

          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: base.w * scale,
                height: base.h * scale,
                zIndex: base.z + catIndex,
                transform: "translate(-50%, -50%)",
              }}
            >
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain drop-shadow-sm" loading="lazy" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
