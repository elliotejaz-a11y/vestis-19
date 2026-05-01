import { ClothingItem } from "@/types/wardrobe";

export const LAYER_ORDER: Record<string, number> = {
  hats: 1,
  outerwear: 2,
  jumpers: 3,
  tops: 4,
  dresses: 4,
  bottoms: 5,
  shoes: 6,
  accessories: 7,
};

export const LAYER_LABELS: Record<string, string> = {
  hats: "Headwear",
  outerwear: "Outerwear",
  jumpers: "Top Layer",
  tops: "Base Top",
  dresses: "Base Top",
  bottoms: "Bottom",
  shoes: "Footwear",
  accessories: "Accessories",
};

export function getLayerOrder(category: string): number {
  return LAYER_ORDER[(category || "").toLowerCase()] ?? 99;
}

export function getLayerLabel(category: string): string {
  return LAYER_LABELS[(category || "").toLowerCase()] ?? category;
}

export function sortByLayerOrder(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => getLayerOrder(a.category) - getLayerOrder(b.category));
}

// Left column: outerwear layers that sit beside the core body
export const LEFT_CATEGORIES = new Set(["outerwear", "jumpers"]);

// Right column: accessories
export const RIGHT_CATEGORIES = new Set(["accessories"]);

// Centre column: core worn items in top-to-bottom body order
export const CENTRE_CATEGORIES = new Set(["hats", "tops", "dresses", "bottoms", "shoes"]);
