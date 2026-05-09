import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processBackgroundRemoval } from "@/lib/wardrobeImageProcessing";
import { isStoragePath, resolveSignedClothingImageFields, batchResolveSignedClothingImageFields, getSignedStorageUrl } from "@/lib/storage";
import { buildRecentIdCounts, isExactDuplicateOfRecent, breakExactDuplicate } from "@/lib/outfitRotation";

const isShoesCategory = (category?: string) => (category || "").trim().toLowerCase() === "shoes";
const isBottomsCategory = (category?: string) => (category || "").trim().toLowerCase() === "bottoms";
const isTopsCategory = (category?: string) => (category || "").trim().toLowerCase() === "tops";
const isTopOrJumperCategory = (category?: string) => {
  const cat = (category || "").trim().toLowerCase();
  return cat === "tops" || cat === "jumpers";
};
const GYM_OCCASION_PATTERN = /\b(gym|workout|training|exercise|fitness|run|running|jog|jogging|cardio|lift|lifting|weights?|pilates|yoga|sport|sports)\b/i;
const GYM_TOP_POSITIVE_PATTERN = /\b(t-?shirt|tee|compression|activewear|athletic|performance|training|workout|gym|sport|sports|polyester|spandex|elastane|nylon|dry[-\s]?fit|moisture[-\s]?wicking|tight(?:-?fitting)?|fitted|muscle|jersey)\b/i;
const GYM_TOP_NEGATIVE_PATTERN = /\b(jacket|coat|hoodie|jumper|sweater|cardigan|blazer|outerwear|parka|puffer|fleece|windbreaker|flannel|dress shirt|button[-\s]?up|oxford|knit|wool|zip[-\s]?up|anorak|shell)\b/i;
const GYM_BOTTOM_POSITIVE_PATTERN = /\b(shorts?|track ?pants?|trackpants?|joggers?|training pants?|workout pants?|athletic|performance|training|workout|gym|sport|sports|lightweight|polyester|spandex|elastane|nylon)\b/i;
const GYM_BOTTOM_NEGATIVE_PATTERN = /\b(jeans?|denim|chinos?|slacks?|trousers?|dress pants?|formal|corduroy|cargo|skirt|wool)\b/i;
const GYM_SHOE_NEGATIVE_PATTERN = /\b(sandals?|slides?|flip[-\s]?flops?|heels?|boots?|loafers?|oxfords?|derbies?|brogues?|mules?|slippers?)\b/i;
const ATHLETIC_SHOE_PATTERN = /\b(TN|TNs|air ?max|air ?force|running shoe|trail shoe|training shoe|gym shoe|sports shoe|basketball shoe|trainer|trainers|jogger shoe|tech runner|boost|ultra ?boost|foam ?runner)\b/i;
const GYM_WEAR_ITEM_PATTERN = /\b(compression|activewear|athletic wear|performance top|training top|workout top|gym top|sports top|spandex|elastane|dry[-\s]?fit|moisture[-\s]?wicking)\b/i;
const FORMAL_OCCASION_PATTERN = /\b(wedding|gala|black[-\s]?tie|formal|cocktail|funeral|opera)\b/i;
const BUSINESS_OCCASION_PATTERN = /\b(business|interview|meeting|office|work|corporate|conference|presentation)\b/i;
const HEAVY_OUTERWEAR_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|winter coat|heavy coat|fur|shearling|down jacket|anorak|peacoat|overcoat|trench coat|duffel coat|toggle coat|wool coat)\b/i;
const WATERPROOF_PATTERN = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex|mac|mackintosh|cagoule|pac[-\s]?a[-\s]?mac|hardshell)\b/i;
const RAINY_PATTERN = /\b(rain|rainy|drizzle|shower|showers|wet|precipitation|storm|stormy|downpour)\b/i;
const COLD_THRESHOLD = 10;
const HOT_THRESHOLD = 25;
const DETAILLESS_REASONING_PATTERNS = [
  /^a curated look/i,
  /curated look/i,
  /combining complementary pieces/i,
  /works well together/i,
  /stylish choice/i,
  /balanced outfit/i,
];

function ensureCategoryRequirement(
  selectedItems: ClothingItem[],
  allItems: ClothingItem[],
  predicate: (item: ClothingItem) => boolean
): ClothingItem[] {
  const available = allItems.filter(predicate);
  if (available.length === 0 || selectedItems.some(predicate)) return selectedItems;

  const replacementPriority = ["accessories", "hats", "outerwear"];
  const replaceIndex = selectedItems.findIndex((item) => replacementPriority.includes((item.category || "").toLowerCase()));

  if (replaceIndex >= 0) {
    const next = [...selectedItems];
    next[replaceIndex] = available[0];
    return next;
  }

  if (selectedItems.length >= 5) {
    const next = [...selectedItems];
    next[next.length - 1] = available[0];
    return next;
  }

  return [...selectedItems, available[0]];
}

function ensureOutfitHasCorePieces(selectedItems: ClothingItem[], allItems: ClothingItem[]): ClothingItem[] {
  const deduped = selectedItems.filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);
  const withTops = ensureCategoryRequirement(deduped, allItems, (item) => isTopOrJumperCategory(item.category));
  const withBottoms = ensureCategoryRequirement(withTops, allItems, (item) => isBottomsCategory(item.category));
  const withShoes = ensureCategoryRequirement(withBottoms, allItems, (item) => isShoesCategory(item.category));
  return withShoes.slice(0, 5);
}

function formatList(values: string[]): string {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

function normalizeStorageObjectPath(value: string): string {
  return value.replace(/^\/+/, "");
}

function getItemSearchText(item: ClothingItem): string {
  return [item.name, item.category, item.color, item.fabric, item.notes, ...(item.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isGymOccasion(occasion: string): boolean {
  return GYM_OCCASION_PATTERN.test(occasion);
}

function isHatCategory(item: ClothingItem): boolean {
  const cat = (item.category || "").trim().toLowerCase();
  return cat === "hats" || cat === "hat";
}

function isAthleticShoe(item: ClothingItem): boolean {
  if (!isShoesCategory(item.category)) return false;
  return ATHLETIC_SHOE_PATTERN.test(getItemSearchText(item));
}

function isGymWearItem(item: ClothingItem): boolean {
  const cat = (item.category || "").trim().toLowerCase();
  if (cat !== "tops" && cat !== "bottoms") return false;
  return GYM_WEAR_ITEM_PATTERN.test(getItemSearchText(item));
}

function filterItemsForOccasion(items: ClothingItem[], occasion: string): ClothingItem[] {
  if (FORMAL_OCCASION_PATTERN.test(occasion) || BUSINESS_OCCASION_PATTERN.test(occasion)) {
    return items.filter(item => !isHatCategory(item) && !isAthleticShoe(item) && !isGymWearItem(item));
  }
  return items.filter(item => !isGymWearItem(item));
}

function isOuterwearCategory(item: ClothingItem): boolean {
  return (item.category || "").trim().toLowerCase() === "outerwear";
}

function isHeavyOuterwear(item: ClothingItem): boolean {
  if (!isOuterwearCategory(item)) return false;
  return HEAVY_OUTERWEAR_PATTERN.test(getItemSearchText(item));
}

function isWaterproofOuterwear(item: ClothingItem): boolean {
  return WATERPROOF_PATTERN.test(getItemSearchText(item));
}

function filterItemsForWeather(items: ClothingItem[], weather: { temp: number; description: string }, occasion: string): ClothingItem[] {
  if (weather.temp > HOT_THRESHOLD) {
    if (FORMAL_OCCASION_PATTERN.test(occasion) || BUSINESS_OCCASION_PATTERN.test(occasion)) {
      return items.filter(item => !isHeavyOuterwear(item));
    }
    return items.filter(item => !isOuterwearCategory(item));
  }
  return items;
}

function normalizeSelectionForWeather(
  selected: ClothingItem[],
  allCandidates: ClothingItem[],
  weather: { temp: number; description: string } | undefined
): ClothingItem[] {
  if (!weather) return selected;

  let result = [...selected];
  const cold = weather.temp < COLD_THRESHOLD;
  const rainy = RAINY_PATTERN.test(weather.description);
  const hot = weather.temp > HOT_THRESHOLD;

  if (hot) {
    return result.filter(item => !isHeavyOuterwear(item));
  }

  if (cold || rainy) {
    const hasOuterwear = result.some(isOuterwearCategory);
    const outerwearPool = allCandidates.filter(isOuterwearCategory);

    if (!hasOuterwear && outerwearPool.length > 0) {
      const inject = rainy
        ? (outerwearPool.find(isWaterproofOuterwear) ?? outerwearPool[0])
        : outerwearPool[0];
      const replaceIdx = result.findIndex(item => {
        const cat = (item.category || "").trim().toLowerCase();
        return cat === "accessories" || cat === "hats";
      });
      if (replaceIdx >= 0) {
        result = [...result];
        result[replaceIdx] = inject;
      } else if (result.length < 5) {
        result = [...result, inject];
      } else {
        result = [...result];
        result[result.length - 1] = inject;
      }
    } else if (rainy && hasOuterwear) {
      const hasWaterproof = result.some(isWaterproofOuterwear);
      if (!hasWaterproof) {
        const waterproofItem = allCandidates.find(item => isOuterwearCategory(item) && isWaterproofOuterwear(item));
        if (waterproofItem) {
          const replaceIdx = result.findIndex(item => isOuterwearCategory(item) && !isWaterproofOuterwear(item));
          if (replaceIdx >= 0) {
            result = [...result];
            result[replaceIdx] = waterproofItem;
          }
        }
      }
    }
  }

  return result.filter((item, i, arr) => arr.findIndex(x => x.id === item.id) === i);
}

function isGymTop(item: ClothingItem): boolean {
  if (!isTopsCategory(item.category)) return false;
  const text = getItemSearchText(item);
  return !GYM_TOP_NEGATIVE_PATTERN.test(text) && GYM_TOP_POSITIVE_PATTERN.test(text);
}

function isGymBottom(item: ClothingItem): boolean {
  if (!isBottomsCategory(item.category)) return false;
  const text = getItemSearchText(item);
  return !GYM_BOTTOM_NEGATIVE_PATTERN.test(text) && GYM_BOTTOM_POSITIVE_PATTERN.test(text);
}

function isGymShoe(item: ClothingItem): boolean {
  if (!isShoesCategory(item.category)) return false;
  return !GYM_SHOE_NEGATIVE_PATTERN.test(getItemSearchText(item));
}

function ensureGymOutfitHasOnlyAllowedPieces(selectedItems: ClothingItem[], allItems: ClothingItem[]): ClothingItem[] {
  const deduped = selectedItems.filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index);
  const top = deduped.find(isGymTop) ?? allItems.find(isGymTop);
  const bottom = deduped.find(isGymBottom) ?? allItems.find(isGymBottom);
  const shoes = deduped.find(isGymShoe) ?? allItems.find(isGymShoe);
  return [top, bottom, shoes].filter(Boolean) as ClothingItem[];
}

function buildMonochromeFallback(allItems: ClothingItem[]): ClothingItem[] {
  const isBlack = (item: ClothingItem) => /\b(black|charcoal|onyx|jet)\b/i.test(item.color || '');
  const isNeutral = (item: ClothingItem) => /\b(black|charcoal|onyx|jet|white|off[-\s]?white|cream|ivory|grey|gray|silver)\b/i.test(item.color || '');
  const isTop = (item: ClothingItem) => ['tops', 'jumpers'].includes((item.category || '').toLowerCase());

  const allBlack = allItems.filter(isBlack);
  const bTop = allBlack.find(isTop);
  const bBottom = allBlack.find(i => isBottomsCategory(i.category));
  const bShoe = allBlack.find(i => isShoesCategory(i.category));
  if (bTop && bBottom && bShoe) return [bTop, bBottom, bShoe];

  const neutrals = allItems.filter(isNeutral);
  const nTop = neutrals.find(isTop);
  const nBottom = neutrals.find(i => isBottomsCategory(i.category));
  const nShoe = neutrals.find(i => isShoesCategory(i.category));
  return [nTop, nBottom, nShoe].filter(Boolean) as ClothingItem[];
}

function isDetailedReasoning(reasoning?: string | null): boolean {
  const text = reasoning?.trim() ?? "";
  if (text.length < 120) return false;
  if (DETAILLESS_REASONING_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const detailSignals = [
    /(cotton|wool|linen|denim|silk|leather|knit|jersey|nylon|polyester|fabric|texture|breathable|structured|lightweight)/i.test(text),
    /(weather|temperature|warm|cool|heat|chill|layer)/i.test(text),
    /(occasion|business|casual|formal|meeting|workout|gym|date|interview|brunch|wedding)/i.test(text),
    /(black|white|grey|gray|navy|beige|tan|blue|green|red|burgundy|maroon|pink|cream|brown|olive|yellow|orange|teal|charcoal|palette|colour|contrast|harmony)/i.test(text),
    /(style|minimalist|classic|streetwear|preppy|smart|relaxed|sporty)/i.test(text),
  ];

  return detailSignals.filter(Boolean).length >= 4;
}

function buildOutfitReasoningFallback({
  occasion,
  selectedItems,
  profile,
  weather,
}: {
  occasion: string;
  selectedItems: ClothingItem[];
  profile?: {
    style_preference?: string | null;
  } | null;
  weather?: { temp: number; description: string };
}): string {
  const itemNames = selectedItems.map((item) => item.name).filter(Boolean).slice(0, 4);
  const colours = selectedItems.map((item) => item.color).filter(Boolean);
  const fabrics = selectedItems.map((item) => item.fabric).filter(Boolean);
  const categories = selectedItems.map((item) => item.category).filter(Boolean);
  const colourText = formatList(colours).toLowerCase();
  const fabricText = formatList(fabrics).toLowerCase();
  const categoryText = formatList(categories).toLowerCase();
  const itemText = formatList(itemNames);
  const stylePreference = profile?.style_preference?.trim();

  const weatherFit = weather
    ? weather.temp >= 22
      ? "keeps the outfit light and breathable"
      : weather.temp <= 12
        ? "adds enough substance for cooler conditions without feeling bulky"
        : "keeps the look comfortable and easy to wear through changing conditions"
    : "suits the setting without feeling overdone";

  const sentences = [
    itemText
      ? `${itemText} work together for ${occasion.toLowerCase()} because the mix of ${categoryText || "key wardrobe pieces"} feels intentional from top to bottom.`
      : `This outfit feels right for ${occasion.toLowerCase()} because each piece supports the same overall direction rather than competing for attention.`,
    colourText
      ? `The ${colourText} palette creates clean contrast and visual balance, which helps the outfit feel polished and easy to wear.`
      : null,
    fabricText
      ? weather
        ? `The ${fabricText} fabrics also make sense here, because they match the ${occasion.toLowerCase()} brief while responding well to ${weather.description.toLowerCase()} weather at ${weather.temp}°C, which ${weatherFit}.`
        : `The ${fabricText} fabrics fit the tone of ${occasion.toLowerCase()}, balancing comfort with the right amount of structure and texture.`
      : null,
    stylePreference
      ? `It also aligns with your ${stylePreference.toLowerCase()} style preference, so the final look feels personal and believable instead of like a random mix of separate items.`
      : `Overall, the outfit feels cohesive because the proportions, colours, and textures all point in the same direction.`,
  ];

  return sentences.filter(Boolean).join(" ");
}

export function useWardrobe() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  // Refs so generateOutfit stays stable even as wardrobe changes
  const itemsRef = useRef(items);
  const outfitsRef = useRef(outfits);
  const profileRef = useRef(profile);
  itemsRef.current = items;
  outfitsRef.current = outfits;
  profileRef.current = profile;

  // Dedup guard for retryBackgroundRemoval
  const retryingIdsRef = useRef(new Set<string>());

  // Pre-sorted wardrobe — least-recently-used items first; only recomputes when wardrobe changes.
  // Window of 20 outfits gives a fair long-term usage picture; the edge function still only
  // receives the last 5 for its avoidance markers, so nothing else changes.
  const sortedItemsByUsage = useMemo(() => {
    const recentIds = outfits.slice(0, 20).map(o => (o.items || []).map(i => i.id));
    const usageCount = new Map<string, number>();
    recentIds.forEach(idSet => {
      idSet.forEach(id => usageCount.set(id, (usageCount.get(id) || 0) + 1));
    });
    return [...items].sort((a, b) => (usageCount.get(a.id) || 0) - (usageCount.get(b.id) || 0));
  }, [items, outfits]);
  const sortedItemsByUsageRef = useRef(sortedItemsByUsage);
  sortedItemsByUsageRef.current = sortedItemsByUsage;

  useEffect(() => {
    if (!user) { setItems([]); setOutfits([]); setLoading(false); return; }

    const fetchAll = async () => {
      // Fetch clothing items and outfits in parallel — eliminates one full round-trip
      const [{ data: clothingData }, { data: outfitData }] = await Promise.all([
        supabase
          .from("clothing_items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("outfits")
          .select("*, outfit_items(clothing_item_id)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const rawItems: ClothingItem[] = (clothingData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        color: r.color,
        fabric: r.fabric,
        imageUrl: isStoragePath(r.image_url) ? "" : r.image_url,
        imagePath: isStoragePath(r.image_url) ? r.image_url : undefined,
        backImageUrl: r.back_image_url && !isStoragePath(r.back_image_url) ? r.back_image_url : undefined,
        backImagePath: isStoragePath(r.back_image_url) ? r.back_image_url : undefined,
        tags: r.tags || [],
        notes: r.notes || "",
        addedAt: new Date(r.created_at),
        estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
        isPrivate: r.is_private || false,
      }));
      const dbItems = await batchResolveSignedClothingImageFields(rawItems);
      setItems(dbItems);

      if (outfitData) {
        const dbOutfits: Outfit[] = outfitData.map((o: any) => {
          const outfitItemIds = (o.outfit_items || []).map((oi: any) => oi.clothing_item_id);
          const outfitClothes = dbItems.filter((i) => outfitItemIds.includes(i.id));
          return {
            id: o.id,
            name: o.name || undefined,
            description: o.description || undefined,
            occasion: o.occasion,
            items: outfitClothes,
            createdAt: new Date(o.created_at),
            reasoning: o.reasoning,
            styleTips: o.style_tips || undefined,
            saved: o.saved || false,
          };
        });
        setOutfits(dbOutfits);
      }
      setLoading(false);
      setDataReady(true);
    };

    fetchAll();
  }, [user]);

  const addItem = useCallback(
    async (item: ClothingItem, options?: { runBackgroundRemoval?: boolean; imageBase64ForProcessing?: string }) => {
      if (!user) return;

      const runBgRemoval = options?.runBackgroundRemoval === true;
      let imageUrl = item.imageUrl;
      let backImageUrl = item.backImageUrl || "";
      if (imageUrl.startsWith("blob:")) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: blob.type });
          if (!uploadError) imageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("Image upload failed:", err);
        }
      } else if (imageUrl.startsWith("data:image/svg+xml")) {
        try {
          const svgData = atob(imageUrl.split(",")[1]);
          const blob = new Blob([svgData], { type: "image/svg+xml" });
          const path = `${user.id}/${crypto.randomUUID()}.svg`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: "image/svg+xml" });
          if (!uploadError) imageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("SVG upload failed:", err);
        }
      } else if (imageUrl.startsWith("data:")) {
        try {
          const parts = imageUrl.split(",");
          const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
          const b64 = parts[1];
          const byteChars = atob(b64);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
          const blob = new Blob([byteArr], { type: mime });
          const ext = mime.split("/")[1] || "png";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: mime });
          if (!uploadError) imageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("Base64 upload failed:", err);
        }
      } else if (!imageUrl.startsWith("http")) {
        // Vite bundled asset (relative path) - fetch and upload
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: blob.type });
          if (!uploadError) imageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("Asset upload failed:", err);
        }
      }

      // Upload back image
      if (backImageUrl && backImageUrl.startsWith("blob:")) {
        try {
          const response = await fetch(backImageUrl);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "png";
          const path = `${user.id}/${crypto.randomUUID()}_back.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: blob.type });
          if (!uploadError) backImageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("Back image upload failed:", err);
        }
      } else if (backImageUrl && backImageUrl.startsWith("data:")) {
        try {
          const parts = backImageUrl.split(",");
          const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
          const b64 = parts[1];
          const byteChars = atob(b64);
          const byteArr = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
          const blob = new Blob([byteArr], { type: mime });
          const ext = mime.split("/")[1] || "png";
          const path = `${user.id}/${crypto.randomUUID()}_back.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("clothing-images")
            .upload(path, blob, { contentType: mime });
          if (!uploadError) backImageUrl = normalizeStorageObjectPath(path);
        } catch (err) {
          console.error("Back image upload failed:", err);
        }
      }

      const { data, error } = await supabase
        .from("clothing_items")
        .insert({
          user_id: user.id,
          name: item.name,
          category: item.category,
          color: item.color,
          fabric: item.fabric,
          image_url: imageUrl,
          back_image_url: backImageUrl || null,
          tags: item.tags,
          notes: item.notes,
          estimated_price: item.estimatedPrice || null,
          size: (item as any).size || "",
          privacy: (item as any).privacy || "public",
          is_private: (item as any).privacy === "private" || item.isPrivate || false,
        })
        .select()
        .single();

      if (error) {
        console.error("clothing_items insert error:", error);
        toast({ title: "Couldn't save item", description: error.message || "Please try again.", variant: "destructive" });
        return;
      }

      if (data) {
        const newItem = await resolveSignedClothingImageFields({
          id: data.id,
          name: data.name,
          category: data.category,
          color: data.color,
          fabric: data.fabric,
          imageUrl: isStoragePath(data.image_url) ? "" : data.image_url,
          imagePath: isStoragePath(data.image_url) ? data.image_url : undefined,
          backImageUrl: data.back_image_url && !isStoragePath(data.back_image_url) ? data.back_image_url : undefined,
          backImagePath: isStoragePath(data.back_image_url) ? data.back_image_url : undefined,
          tags: data.tags || [],
          notes: data.notes || "",
          addedAt: new Date(data.created_at),
          estimatedPrice: data.estimated_price ? Number(data.estimated_price) : undefined,
          isPrivate: data.is_private ?? false,
        });
        setItems((prev) => [newItem, ...prev]);
        toast({ title: "Added to wardrobe! ✨" });

        if (runBgRemoval && data.id) {
          processBackgroundRemoval({
            itemId: data.id,
            imageUrl,
            userId: user.id,
            imageBase64ForProcessing: options?.imageBase64ForProcessing,
            onStatusUpdate: (payload) => {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === data.id
                    ? {
                        ...i,
                        imageUrl: payload.imageUrl ? payload.imageUrl : i.imageUrl,
                        imageStatus: payload.imageStatus,
                        imageError: payload.imageError ?? i.imageError,
                      }
                    : i
                )
              );
              if (payload.imageStatus === "failed") {
                toast({
                  title: "Background removal didn’t complete",
                  description: payload.imageError || "Tap the card to retry.",
                  variant: "destructive",
                });
              }
            },
          });
        }
      }
    },
    [user, toast]
  );

  const retryBackgroundRemoval = useCallback(
    async (itemId: string) => {
      if (!user) return;
      if (retryingIdsRef.current.has(itemId)) return;
      retryingIdsRef.current.add(itemId);
      try {
        const item = items.find((i) => i.id === itemId);
        if (!item) return;
        const sourceUrl = item.imageOriginalUrl || item.imagePath || item.imageUrl;
        await supabase
          .from("clothing_items")
          .update({ image_status: "processing", image_error: null } as any)
          .eq("id", itemId)
          .eq("user_id", user.id);
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, imageStatus: "processing" as const, imageError: undefined } : i))
        );
        processBackgroundRemoval({
          itemId,
          imageUrl: sourceUrl,
          userId: user.id,
          isRetry: true,
          onStatusUpdate: (payload) => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      imageUrl: payload.imageUrl ?? i.imageUrl,
                      imageStatus: payload.imageStatus,
                      imageError: payload.imageError ?? i.imageError,
                    }
                  : i
              )
            );
            if (payload.imageStatus === "failed") {
              toast({
                title: "Background removal didn’t complete",
                description: payload.imageError || "Try again later.",
                variant: "destructive",
              });
            }
          },
        });
      } finally {
        retryingIdsRef.current.delete(itemId);
      }
    },
    [items, user, toast]
  );

  const updateItem = useCallback(
    async (item: ClothingItem) => {
      if (!user) return;
      const { error } = await supabase
        .from("clothing_items")
        .update({
          name: item.name,
          category: item.category,
          color: item.color,
          fabric: item.fabric,
          notes: item.notes,
          estimated_price: item.estimatedPrice || null,
          is_private: item.isPrivate || false,
          image_url: item.imagePath || item.imageUrl,
          size: (item as any).size || "",
          privacy: (item as any).privacy || "public",
        } as any)
        .eq("id", item.id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Couldn't save changes", description: "Please try again.", variant: "destructive" });
        return;
      }
      setItems((prev) => prev.map((i) => i.id === item.id ? item : i));
    },
    [user, toast]
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("clothing_items").delete().eq("id", id).eq("user_id", user.id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [user]
  );

  const saveOutfit = useCallback(
    async (id: string, saved: boolean, name?: string, description?: string) => {
      if (!user) return;
      const update: Record<string, any> = { saved };
      if (name !== undefined) update.name = name;
      if (description !== undefined) update.description = description;
      await supabase.from("outfits").update(update as any).eq("id", id).eq("user_id", user.id);
      setOutfits((prev) => prev.map((o) => (o.id === id ? { ...o, saved, ...(name !== undefined ? { name } : {}), ...(description !== undefined ? { description } : {}) } : o)));
    },
    [user]
  );

  const deleteOutfit = useCallback(
    async (id: string) => {
      if (!user) return;
      const snapshot = outfitsRef.current;
      setOutfits((prev) => prev.filter((o) => o.id !== id));
      try {
        const { error: itemsErr } = await supabase.from("outfit_items").delete().match({ outfit_id: id });
        if (itemsErr) throw itemsErr;
        const { error: outfitErr } = await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);
        if (outfitErr) throw outfitErr;
      } catch (err) {
        setOutfits(snapshot);
        toast({ title: "Couldn't delete outfit", description: "Please try again.", variant: "destructive" });
      }
    },
    [user, toast]
  );

  const generateOutfit = useCallback(
    async (occasion: string, weather?: { temp: number; description: string }, colourStory?: string): Promise<Outfit | null> => {
      const items = itemsRef.current;
      const outfits = outfitsRef.current;
      const profile = profileRef.current;
      if (!user || items.length < 2) return null;

      const missingCore: string[] = [];
      if (!items.some((item) => isTopOrJumperCategory(item.category))) missingCore.push("top or jumper");
      if (!items.some((item) => isBottomsCategory(item.category))) missingCore.push("bottoms");
      if (!items.some((item) => isShoesCategory(item.category))) missingCore.push("shoes");

      if (missingCore.length > 0) {
        toast({
          title: "Add required items to generate outfits",
          description: `Every outfit requires at least one ${missingCore.join(" and ")} item.`,
          variant: "destructive",
        });
        return null;
      }

      try {
        const gymRequest = isGymOccasion(occasion);
        const recentOutfitItemIds = outfits.slice(0, 5).map(o => (o.items || []).map(i => i.id));
        const sortedItems = sortedItemsByUsageRef.current;

        const { data, error } = await supabase.functions.invoke("generate-outfit", {
          body: {
            occasion,
            items: sortedItems,
            weather,
            userProfile: profile ? {
              stylePreference: profile.style_preference,
              bodyType: profile.body_type,
              preferredColors: profile.preferred_colors,
              fashionGoals: profile.fashion_goals,
            } : undefined,
            recentOutfitItemIds,
            colourStory,
          },
        });

        if (error) throw error;

        let selectedItems: ClothingItem[] = gymRequest
          ? ensureGymOutfitHasOnlyAllowedPieces((data.items || []) as ClothingItem[], items)
          : ensureOutfitHasCorePieces((data.items || []) as ClothingItem[], items);

        // Safety net: if the edge function still returned an exact duplicate, break it using
        // the least-recently-worn + most colour-compatible alternative. Passes outfit history
        // so the replacement itself cannot create a duplicate of an earlier outfit.
        // The edge function handles primary rotation (applyDiversityPass + Phase 2 inside the
        // function); this client guard only fires in the rare case that slips through.
        if (!gymRequest && isExactDuplicateOfRecent(selectedItems, outfits)) {
          selectedItems = breakExactDuplicate(
            selectedItems,
            sortedItemsByUsageRef.current,
            buildRecentIdCounts(outfits),
            [
              (i) => isBottomsCategory(i.category),
              (i) => isShoesCategory(i.category),
              (i) => isTopOrJumperCategory(i.category),
            ],
            outfits
          );
        }

        const resolvedReasoning = isDetailedReasoning(data.reasoning)
          ? data.reasoning.trim()
          : buildOutfitReasoningFallback({ occasion, selectedItems, profile, weather });
        const resolvedStyleTips = typeof data.style_tips === "string" && data.style_tips.trim()
          ? data.style_tips.trim()
          : null;

        const { data: outfitRow, error: outfitErr } = await supabase
          .from("outfits")
          .insert({ user_id: user.id, occasion, reasoning: resolvedReasoning, style_tips: resolvedStyleTips })
          .select()
          .single();

        if (outfitErr || !outfitRow) throw outfitErr;

        if (selectedItems.length > 0) {
          await supabase.from("outfit_items").insert(
            selectedItems.map((si: ClothingItem) => ({ outfit_id: outfitRow.id, clothing_item_id: si.id }))
          );
        }

        const outfit: Outfit = {
          id: outfitRow.id, occasion, items: selectedItems, createdAt: new Date(outfitRow.created_at),
          reasoning: resolvedReasoning, styleTips: resolvedStyleTips || undefined, saved: false,
        };
        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      } catch (err) {
        console.error("AI outfit generation failed:", err);
        const gymRequest = isGymOccasion(occasion);
        if (gymRequest) {
          const gymFallbackItems = ensureGymOutfitHasOnlyAllowedPieces([], items);
          if (gymFallbackItems.length === 3) {
            const fallbackReasoning = buildOutfitReasoningFallback({ occasion, selectedItems: gymFallbackItems, profile, weather });
            const { data: outfitRow } = await supabase
              .from("outfits")
              .insert({ user_id: user.id, occasion, reasoning: fallbackReasoning })
              .select().single();

            if (outfitRow) {
              await supabase.from("outfit_items").insert(
                gymFallbackItems.map((si) => ({ outfit_id: outfitRow.id, clothing_item_id: si.id }))
              );
            }

            const outfit: Outfit = {
              id: outfitRow?.id || crypto.randomUUID(), occasion, items: gymFallbackItems, createdAt: new Date(),
              reasoning: fallbackReasoning, saved: false,
            };
            setOutfits((prev) => [outfit, ...prev]);
            return outfit;
          }
        }

        const occasionFilteredItems = filterItemsForOccasion(items, occasion);
        const weatherFilteredItems = weather ? filterItemsForWeather(occasionFilteredItems, weather, occasion) : occasionFilteredItems;
        const monochromeBase = buildMonochromeFallback(weatherFilteredItems);
        const coreItems = ensureOutfitHasCorePieces(monochromeBase, weatherFilteredItems);
        let fallbackItems = normalizeSelectionForWeather(coreItems, weatherFilteredItems, weather);
        if (isExactDuplicateOfRecent(fallbackItems, outfits)) {
          fallbackItems = breakExactDuplicate(
            fallbackItems,
            sortedItemsByUsageRef.current,
            buildRecentIdCounts(outfits),
            [
              (i) => isBottomsCategory(i.category),
              (i) => isShoesCategory(i.category),
              (i) => isTopOrJumperCategory(i.category),
            ],
            outfits
          );
        }
        const fallbackReasoning = buildOutfitReasoningFallback({ occasion, selectedItems: fallbackItems, profile, weather });

        const { data: outfitRow } = await supabase
          .from("outfits")
          .insert({ user_id: user.id, occasion, reasoning: fallbackReasoning })
          .select().single();

        if (outfitRow && fallbackItems.length > 0) {
          await supabase.from("outfit_items").insert(
            fallbackItems.map((si) => ({ outfit_id: outfitRow.id, clothing_item_id: si.id }))
          );
        }

        const outfit: Outfit = {
          id: outfitRow?.id || crypto.randomUUID(), occasion, items: fallbackItems, createdAt: new Date(),
          reasoning: fallbackReasoning, saved: false,
        };
        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      }
    },
    [user, toast]
  );

  const addOutfitToState = useCallback((outfit: Outfit) => {
    setOutfits((prev) => {
      if (prev.some(o => o.id === outfit.id)) return prev;
      return [outfit, ...prev];
    });
  }, []);

  const addItemToState = useCallback((item: ClothingItem) => {
    setItems((prev) => {
      if (prev.some(i => i.id === item.id)) return prev;
      return [item, ...prev];
    });
  }, []);

  return { items, outfits, addItem, addItemToState, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState, loading, dataReady };
}
