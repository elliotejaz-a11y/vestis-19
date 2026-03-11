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

export function sortItemsHeadToToe(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const aIdx = HEAD_TO_TOE_ORDER.indexOf(a.category);
    const bIdx = HEAD_TO_TOE_ORDER.indexOf(b.category);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });
}
