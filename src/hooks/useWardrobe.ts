import { useState, useCallback, useEffect } from "react";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processBackgroundRemoval } from "@/lib/wardrobeImageProcessing";
import { getSkinToneDisplay } from "@/lib/skinTone";

const isShoesCategory = (category?: string) => (category || "").trim().toLowerCase() === "shoes";
const isBottomsCategory = (category?: string) => (category || "").trim().toLowerCase() === "bottoms";
const isTopsCategory = (category?: string) => (category || "").trim().toLowerCase() === "tops";
const GYM_OCCASION_PATTERN = /\b(gym|workout|training|exercise|fitness|run|running|jog|jogging|cardio|lift|lifting|weights?|pilates|yoga|sport|sports)\b/i;
const GYM_TOP_POSITIVE_PATTERN = /\b(t-?shirt|tee|compression|activewear|athletic|performance|training|workout|gym|sport|sports|polyester|spandex|elastane|nylon|dry[-\s]?fit|moisture[-\s]?wicking|tight(?:-?fitting)?|fitted|muscle|jersey)\b/i;
const GYM_TOP_NEGATIVE_PATTERN = /\b(jacket|coat|hoodie|jumper|sweater|cardigan|blazer|outerwear|parka|puffer|fleece|windbreaker|flannel|dress shirt|button[-\s]?up|oxford|knit|wool|zip[-\s]?up|anorak|shell)\b/i;
const GYM_BOTTOM_POSITIVE_PATTERN = /\b(shorts?|track ?pants?|trackpants?|joggers?|training pants?|workout pants?|athletic|performance|training|workout|gym|sport|sports|lightweight|polyester|spandex|elastane|nylon)\b/i;
const GYM_BOTTOM_NEGATIVE_PATTERN = /\b(jeans?|denim|chinos?|slacks?|trousers?|dress pants?|formal|corduroy|cargo|skirt|wool)\b/i;
const GYM_SHOE_NEGATIVE_PATTERN = /\b(sandals?|slides?|flip[-\s]?flops?|heels?|boots?|loafers?|oxfords?|derbies?|brogues?|mules?|slippers?)\b/i;
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
  const withBottoms = ensureCategoryRequirement(deduped, allItems, (item) => isBottomsCategory(item.category));
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

function getItemSearchText(item: ClothingItem): string {
  return [item.name, item.category, item.color, item.fabric, item.notes, ...(item.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isGymOccasion(occasion: string): boolean {
  return GYM_OCCASION_PATTERN.test(occasion);
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

function isDetailedReasoning(reasoning?: string | null): boolean {
  const text = reasoning?.trim() ?? "";
  if (text.length < 120) return false;
  if (DETAILLESS_REASONING_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const detailSignals = [
    /(skin tone|undertone|complexion)/i.test(text),
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
    skin_tone?: string | null;
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
  const skinTone = getSkinToneDisplay(profile?.skin_tone)?.trim();
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
      ? skinTone
        ? `The ${colourText} palette is balanced in a way that flatters your ${skinTone.toLowerCase()} skin tone, giving you contrast and depth without making the outfit feel too loud for the occasion.`
        : `The ${colourText} palette creates clean contrast and visual balance, which helps the outfit feel polished and easy to wear.`
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

  useEffect(() => {
    if (!user) { setItems([]); setOutfits([]); setLoading(false); return; }

    const fetchAll = async () => {
      const { data: clothingData } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const dbItems: ClothingItem[] = (clothingData || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        color: r.color,
        fabric: r.fabric,
        imageUrl: r.image_url,
        backImageUrl: r.back_image_url || undefined,
        tags: r.tags || [],
        notes: r.notes || "",
        addedAt: new Date(r.created_at),
        estimatedPrice: r.estimated_price ? Number(r.estimated_price) : undefined,
        isPrivate: r.is_private || false,
      }));
      setItems(dbItems);

      const { data: outfitData } = await supabase
        .from("outfits")
        .select("*, outfit_items(clothing_item_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

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
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
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
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
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
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
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
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error("Asset upload failed:", err);
        }
      }

      // Upload back image if it's a data URL
      if (backImageUrl && backImageUrl.startsWith("data:")) {
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
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("clothing-images").getPublicUrl(path);
            backImageUrl = urlData.publicUrl;
          }
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
        })
        .select()
        .single();

      if (!error && data) {
        const newItem: ClothingItem = {
          id: data.id,
          name: data.name,
          category: data.category,
          color: data.color,
          fabric: data.fabric,
          imageUrl: data.image_url,
          backImageUrl: data.back_image_url || undefined,
          tags: data.tags || [],
          notes: data.notes || "",
          addedAt: new Date(data.created_at),
          estimatedPrice: data.estimated_price ? Number(data.estimated_price) : undefined,
          isPrivate: data.is_private ?? false,
        };
        setItems((prev) => [newItem, ...prev]);

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
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const sourceUrl = item.imageOriginalUrl || item.imageUrl;
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
    },
    [items, user, toast]
  );

  const updateItem = useCallback(
    async (item: ClothingItem) => {
      if (!user) return;
      await supabase
        .from("clothing_items")
        .update({
          name: item.name,
          category: item.category,
          color: item.color,
          fabric: item.fabric,
          notes: item.notes,
          estimated_price: item.estimatedPrice || null,
          is_private: item.isPrivate || false,
          image_url: item.imageUrl,
          size: (item as any).size || "",
          privacy: (item as any).privacy || "public",
        } as any)
        .eq("id", item.id)
        .eq("user_id", user.id);
      setItems((prev) => prev.map((i) => i.id === item.id ? item : i));
    },
    [user]
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
      // Optimistic: remove from UI immediately
      setOutfits((prev) => prev.filter((o) => o.id !== id));
      // Then delete from DB in background
      supabase.from("outfit_items").delete().match({ outfit_id: id })
        .then(() => supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id));
    },
    [user]
  );

  const generateOutfit = useCallback(
    async (occasion: string, weather?: { temp: number; description: string }): Promise<Outfit | null> => {
      if (!user || items.length < 2) return null;

      const missingCore: string[] = [];
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
        const { data, error } = await supabase.functions.invoke("generate-outfit", {
          body: {
            occasion,
            items,
            weather,
            userProfile: profile ? {
              skinTone: getSkinToneDisplay(profile.skin_tone),
              stylePreference: profile.style_preference,
              bodyType: profile.body_type,
              preferredColors: profile.preferred_colors,
              fashionGoals: profile.fashion_goals,
            } : undefined,
          },
        });

        if (error) throw error;

        const selectedItems: ClothingItem[] = gymRequest
          ? ensureGymOutfitHasOnlyAllowedPieces((data.items || []) as ClothingItem[], items)
          : ensureOutfitHasCorePieces((data.items || []) as ClothingItem[], items);
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

        const nonCoreCategories = [...new Set(
          items
            .filter((i) => !isShoesCategory(i.category) && !isBottomsCategory(i.category))
            .map((i) => i.category)
        )];
        const selected: ClothingItem[] = [];
        for (const cat of nonCoreCategories) {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length > 0) selected.push(catItems[Math.floor(Math.random() * catItems.length)]);
          if (selected.length >= 3) break;
        }
        const baseFallback = selected.length >= 1
          ? selected
          : [...items.filter((i) => !isShoesCategory(i.category) && !isBottomsCategory(i.category))]
              .sort(() => Math.random() - 0.5)
              .slice(0, 2);
        const fallbackItems = ensureOutfitHasCorePieces(baseFallback, items);
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
    [user, items, profile, toast]
  );

  const addOutfitToState = useCallback((outfit: Outfit) => {
    setOutfits((prev) => {
      if (prev.some(o => o.id === outfit.id)) return prev;
      return [outfit, ...prev];
    });
  }, []);

  return { items, outfits, addItem, updateItem, removeItem, generateOutfit, saveOutfit, deleteOutfit, retryBackgroundRemoval, addOutfitToState, loading };
}
