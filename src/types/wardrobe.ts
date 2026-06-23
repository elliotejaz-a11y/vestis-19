/** Image processing state for wardrobe item (background removal). */
export type ClothingImageStatus = "processing" | "ready" | "failed";

export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  fabric: string;
  imageUrl: string;
  imagePath?: string;
  backImageUrl?: string;
  backImagePath?: string;
  /** Original image URL before background removal (for retry/fallback). */
  imageOriginalUrl?: string | null;
  /** processing | ready | failed */
  imageStatus?: ClothingImageStatus;
  /** Error message when imageStatus === "failed". */
  imageError?: string | null;
  tags: string[];
  notes: string;
  addedAt: Date;
  estimatedPrice?: number;
  isPrivate?: boolean;
}

export interface Outfit {
  id: string;
  name?: string;
  description?: string;
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
  | "hats"
  | "tops"
  | "bottoms"
  | "dresses"
  | "jumpers"
  | "outerwear"
  | "shoes"
  | "accessories";

export const CATEGORIES: { value: ClothingCategory; label: string; icon: string }[] = [
  { value: "hats", label: "Hats", icon: "🧢" },
  { value: "tops", label: "Tops", icon: "👕" },
  { value: "bottoms", label: "Bottoms", icon: "👖" },
  { value: "dresses", label: "Dresses", icon: "👗" },
  { value: "jumpers", label: "Jumpers", icon: "🧶" },
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
  "Travel",
];

// ── Style This Item types ────────────────────────────────────────────────────

export type StyleOccasion =
  | 'everyday_casual'
  | 'work_office'
  | 'date_night'
  | 'formal_event'
  | 'outdoor_active'
  | 'weekend_brunch'
  | 'night_out'
  | 'travel';

export type StyleDirection =
  | 'minimal_clean'
  | 'streetwear_edge'
  | 'smart_casual'
  | 'classic_tailored'
  | 'relaxed_luxe'
  | 'bold_expressive';

export interface WeatherContext {
  temperatureCelsius: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'cold' | 'hot';
  feelsLikeCelsius?: number;
}

export interface StyleThisItemRequest {
  anchorItem: ClothingItem;
  occasion: StyleOccasion;
  styleDirection: StyleDirection;
  weather: WeatherContext;
  wardrobeItems: ClothingItem[];
}

export interface StyledOutfitResult {
  outfitId: string;
  outfitName: string;
  styleNote: string;
  items: {
    anchor: ClothingItem;
    top?: ClothingItem;
    bottom?: ClothingItem;
    outerwear?: ClothingItem;
    shoes?: ClothingItem;
    accessories: ClothingItem[];
  };
  occasion: StyleOccasion;
  styleDirection: StyleDirection;
  weatherContext: WeatherContext;
  generatedAt: string;
}

export interface PresetItem {
  name: string;
  category: ClothingCategory;
  color: string;
  fabric: string;
  tags: string[];
}

// ── Essentials Catalogue types ───────────────────────────────────────────────

export type EssentialsCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Shoes'
  | 'Outerwear'
  | 'Accessories'
  | 'Bags'
  | 'Dresses'
  | 'Knitwear';

export interface EssentialsCatalogueItem {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  colour: string | null;
  colour_hex: string | null;
  brand: string | null;
  description: string | null;
  image_url: string;
  image_url_full: string | null;
  image_placeholder: string | null;
  tags: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface UserEssential {
  id: string;
  user_id: string;
  essential_id: string;
  added_at: string;
  essential?: EssentialsCatalogueItem;
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
