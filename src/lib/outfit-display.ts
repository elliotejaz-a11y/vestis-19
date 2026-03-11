import { ClothingItem } from "@/types/wardrobe";

export const HEAD_TO_TOE_ORDER = [
  "accessories",
  "outerwear",
  "jumpers",
  "tops",
  "dresses",
  "bottoms",
  "shoes",
];

export const ITEM_MAX_SIZE: Record<string, string> = {
  accessories: "max-w-14",
  outerwear: "max-w-20",
  jumpers: "max-w-24",
  tops: "max-w-24",
  dresses: "max-w-28",
  bottoms: "max-w-24",
  shoes: "max-w-14",
};

export function sortItemsHeadToToe(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const aIdx = HEAD_TO_TOE_ORDER.indexOf(a.category);
    const bIdx = HEAD_TO_TOE_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}
