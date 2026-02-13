export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  fabric: string;
  imageUrl: string;
  tags: string[];
  addedAt: Date;
}

export interface Outfit {
  id: string;
  occasion: string;
  items: ClothingItem[];
  createdAt: Date;
  reasoning: string;
  styleTips?: string;
}

export type ClothingCategory =
  | "tops"
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "shoes"
  | "accessories";

export const CATEGORIES: { value: ClothingCategory; label: string; icon: string }[] = [
  { value: "tops", label: "Tops", icon: "👕" },
  { value: "bottoms", label: "Bottoms", icon: "👖" },
  { value: "dresses", label: "Dresses", icon: "👗" },
  { value: "outerwear", label: "Outerwear", icon: "🧥" },
  { value: "shoes", label: "Shoes", icon: "👟" },
  { value: "accessories", label: "Accessories", icon: "👜" },
];

export const OCCASIONS = [
  "Casual day out",
  "Business meeting",
  "Date night",
  "Wedding guest",
  "Beach / Vacation",
  "Gym / Workout",
  "Brunch with friends",
  "Job interview",
  "Night out / Party",
  "Formal event",
];
