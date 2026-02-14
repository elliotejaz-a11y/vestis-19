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
  svgIcon: string;
}

export const PRESET_ITEMS: PresetItem[] = [
  // Tops
  { name: "White T-Shirt", category: "tops", color: "White", fabric: "Cotton", tags: ["casual", "basic"], svgIcon: "tshirt" },
  { name: "Black T-Shirt", category: "tops", color: "Black", fabric: "Cotton", tags: ["casual", "basic"], svgIcon: "tshirt" },
  { name: "Navy Polo Shirt", category: "tops", color: "Navy", fabric: "Cotton", tags: ["smart-casual", "classic"], svgIcon: "polo" },
  { name: "White Button-Down Shirt", category: "tops", color: "White", fabric: "Cotton", tags: ["formal", "classic"], svgIcon: "buttondown" },
  { name: "Gray Hoodie", category: "tops", color: "Gray", fabric: "Cotton", tags: ["casual", "streetwear"], svgIcon: "hoodie" },
  { name: "Striped Breton Top", category: "tops", color: "White", fabric: "Cotton", tags: ["casual", "classic"], svgIcon: "breton" },
  // Bottoms
  { name: "Blue Jeans", category: "bottoms", color: "Blue", fabric: "Denim", tags: ["casual", "classic"], svgIcon: "jeans" },
  { name: "Black Jeans", category: "bottoms", color: "Black", fabric: "Denim", tags: ["casual", "versatile"], svgIcon: "jeans" },
  { name: "Khaki Chinos", category: "bottoms", color: "Tan", fabric: "Cotton", tags: ["smart-casual", "classic"], svgIcon: "chinos" },
  { name: "Black Trousers", category: "bottoms", color: "Black", fabric: "Polyester", tags: ["formal", "classic"], svgIcon: "trousers" },
  { name: "Gray Joggers", category: "bottoms", color: "Gray", fabric: "Cotton", tags: ["casual", "sporty"], svgIcon: "joggers" },
  // Dresses
  { name: "Little Black Dress", category: "dresses", color: "Black", fabric: "Polyester", tags: ["formal", "elegant"], svgIcon: "dress" },
  { name: "White Summer Dress", category: "dresses", color: "White", fabric: "Cotton", tags: ["casual", "summer"], svgIcon: "dress" },
  { name: "Navy Midi Dress", category: "dresses", color: "Navy", fabric: "Polyester", tags: ["smart-casual", "versatile"], svgIcon: "dress" },
  // Outerwear
  { name: "Black Leather Jacket", category: "outerwear", color: "Black", fabric: "Leather", tags: ["edgy", "classic"], svgIcon: "jacket" },
  { name: "Navy Blazer", category: "outerwear", color: "Navy", fabric: "Wool", tags: ["formal", "classic"], svgIcon: "blazer" },
  { name: "Beige Trench Coat", category: "outerwear", color: "Beige", fabric: "Cotton", tags: ["classic", "elegant"], svgIcon: "trench" },
  { name: "Gray Puffer Jacket", category: "outerwear", color: "Gray", fabric: "Nylon", tags: ["casual", "winter"], svgIcon: "puffer" },
  // Shoes
  { name: "White Sneakers", category: "shoes", color: "White", fabric: "Leather", tags: ["casual", "versatile"], svgIcon: "sneakers" },
  { name: "Black Dress Shoes", category: "shoes", color: "Black", fabric: "Leather", tags: ["formal", "classic"], svgIcon: "dressshoes" },
  { name: "Brown Boots", category: "shoes", color: "Brown", fabric: "Leather", tags: ["casual", "rugged"], svgIcon: "boots" },
  { name: "Black Heels", category: "shoes", color: "Black", fabric: "Leather", tags: ["formal", "elegant"], svgIcon: "heels" },
  // Accessories
  { name: "Black Belt", category: "accessories", color: "Black", fabric: "Leather", tags: ["classic", "essential"], svgIcon: "belt" },
  { name: "Silver Watch", category: "accessories", color: "Gray", fabric: "Canvas", tags: ["classic", "everyday"], svgIcon: "watch" },
  { name: "Black Sunglasses", category: "accessories", color: "Black", fabric: "Nylon", tags: ["casual", "summer"], svgIcon: "sunglasses" },
  { name: "Beige Scarf", category: "accessories", color: "Beige", fabric: "Wool", tags: ["winter", "classic"], svgIcon: "scarf" },
];
