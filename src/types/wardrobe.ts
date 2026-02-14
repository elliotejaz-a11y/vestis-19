export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  fabric: string;
  imageUrl: string;
  tags: string[];
  notes: string;
  addedAt: Date;
  estimatedPrice?: number;
}

export interface Outfit {
  id: string;
  occasion: string;
  items: ClothingItem[];
  createdAt: Date;
  reasoning: string;
  styleTips?: string;
  saved?: boolean;
}

export interface PlannedOutfit {
  id: string;
  outfitId: string;
  plannedDate: string;
  notes: string;
  worn: boolean;
  outfit?: Outfit;
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

export interface PresetItem {
  name: string;
  category: ClothingCategory;
  color: string;
  fabric: string;
  tags: string[];
}

export const PRESET_ITEMS: PresetItem[] = [
  // Tops
  { name: "White T-Shirt", category: "tops", color: "White", fabric: "Cotton", tags: ["casual", "basic"] },
  { name: "Black T-Shirt", category: "tops", color: "Black", fabric: "Cotton", tags: ["casual", "basic"] },
  { name: "Navy Polo Shirt", category: "tops", color: "Navy", fabric: "Cotton", tags: ["smart-casual", "classic"] },
  { name: "White Button-Down Shirt", category: "tops", color: "White", fabric: "Cotton", tags: ["formal", "classic"] },
  { name: "Gray Hoodie", category: "tops", color: "Gray", fabric: "Cotton", tags: ["casual", "streetwear"] },
  { name: "Striped Breton Top", category: "tops", color: "White", fabric: "Cotton", tags: ["casual", "classic"] },
  // Bottoms
  { name: "Blue Jeans", category: "bottoms", color: "Blue", fabric: "Denim", tags: ["casual", "classic"] },
  { name: "Black Jeans", category: "bottoms", color: "Black", fabric: "Denim", tags: ["casual", "versatile"] },
  { name: "Khaki Chinos", category: "bottoms", color: "Tan", fabric: "Cotton", tags: ["smart-casual", "classic"] },
  { name: "Black Trousers", category: "bottoms", color: "Black", fabric: "Polyester", tags: ["formal", "classic"] },
  { name: "Gray Joggers", category: "bottoms", color: "Gray", fabric: "Cotton", tags: ["casual", "sporty"] },
  // Dresses
  { name: "Little Black Dress", category: "dresses", color: "Black", fabric: "Polyester", tags: ["formal", "elegant"] },
  { name: "White Summer Dress", category: "dresses", color: "White", fabric: "Cotton", tags: ["casual", "summer"] },
  { name: "Navy Midi Dress", category: "dresses", color: "Navy", fabric: "Polyester", tags: ["smart-casual", "versatile"] },
  // Outerwear
  { name: "Black Leather Jacket", category: "outerwear", color: "Black", fabric: "Leather", tags: ["edgy", "classic"] },
  { name: "Navy Blazer", category: "outerwear", color: "Navy", fabric: "Wool", tags: ["formal", "classic"] },
  { name: "Beige Trench Coat", category: "outerwear", color: "Beige", fabric: "Cotton", tags: ["classic", "elegant"] },
  { name: "Gray Puffer Jacket", category: "outerwear", color: "Gray", fabric: "Nylon", tags: ["casual", "winter"] },
  // Shoes
  { name: "White Sneakers", category: "shoes", color: "White", fabric: "Leather", tags: ["casual", "versatile"] },
  { name: "Black Dress Shoes", category: "shoes", color: "Black", fabric: "Leather", tags: ["formal", "classic"] },
  { name: "Brown Boots", category: "shoes", color: "Brown", fabric: "Leather", tags: ["casual", "rugged"] },
  { name: "Black Heels", category: "shoes", color: "Black", fabric: "Leather", tags: ["formal", "elegant"] },
  // Accessories
  { name: "Black Belt", category: "accessories", color: "Black", fabric: "Leather", tags: ["classic", "essential"] },
  { name: "Silver Watch", category: "accessories", color: "Gray", fabric: "Canvas", tags: ["classic", "everyday"] },
  { name: "Black Sunglasses", category: "accessories", color: "Black", fabric: "Nylon", tags: ["casual", "summer"] },
  { name: "Beige Scarf", category: "accessories", color: "Beige", fabric: "Wool", tags: ["winter", "classic"] },
];
