import { ClothingItem } from "@/types/wardrobe";

/** Head-to-toe display order for outfit items */
export const HEAD_TO_TOE_ORDER = [
  "accessories",
  "outerwear",
  "jumpers",
  "tops",
  "dresses",
  "bottoms",
  "shoes",
];

/** Sort clothing items in head-to-toe order for display */
export function sortItemsHeadToToe(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const aIdx = HEAD_TO_TOE_ORDER.indexOf(a.category);
    const bIdx = HEAD_TO_TOE_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}

/** Category-specific max sizes for outfit card displays */
export const ITEM_MAX_SIZE: Record<string, string> = {
  accessories: "max-h-16 w-16",
  outerwear: "max-h-24 w-24",
  jumpers: "max-h-28 w-28",
  tops: "max-h-28 w-28",
  dresses: "max-h-32 w-32",
  bottoms: "max-h-28 w-28",
  shoes: "max-h-16 w-16",
};
