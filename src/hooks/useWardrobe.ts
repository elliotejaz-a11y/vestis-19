import { useState, useCallback, useEffect } from "react";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useWardrobe() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch items from DB
  useEffect(() => {
    if (!user) { setItems([]); setOutfits([]); setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      const { data: clothingData } = await supabase
        .from("clothing_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const dbItems: ClothingItem[] = (clothingData || []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        color: r.color,
        fabric: r.fabric,
        imageUrl: r.image_url,
        tags: r.tags || [],
        addedAt: new Date(r.created_at),
      }));
      setItems(dbItems);

      // Fetch outfits with their items
      const { data: outfitData } = await supabase
        .from("outfits")
        .select("*, outfit_items(clothing_item_id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (outfitData) {
        const dbOutfits: Outfit[] = outfitData.map((o) => {
          const outfitItemIds = (o.outfit_items || []).map((oi: any) => oi.clothing_item_id);
          const outfitClothes = dbItems.filter((i) => outfitItemIds.includes(i.id));
          return {
            id: o.id,
            occasion: o.occasion,
            items: outfitClothes,
            createdAt: new Date(o.created_at),
            reasoning: o.reasoning,
            styleTips: o.style_tips || undefined,
          };
        });
        setOutfits(dbOutfits);
      }
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const addItem = useCallback(
    async (item: ClothingItem) => {
      if (!user) return;

      // Upload image to storage if it's a blob URL
      let imageUrl = item.imageUrl;
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
            const { data: urlData } = supabase.storage
              .from("clothing-images")
              .getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
        } catch (err) {
          console.error("Image upload failed:", err);
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
          tags: item.tags,
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
          tags: data.tags || [],
          addedAt: new Date(data.created_at),
        };
        setItems((prev) => [newItem, ...prev]);
      }
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

  const generateOutfit = useCallback(
    async (occasion: string): Promise<Outfit | null> => {
      if (!user || items.length < 2) return null;

      try {
        const { data, error } = await supabase.functions.invoke("generate-outfit", {
          body: {
            occasion,
            items,
            userProfile: profile ? {
              skinTone: profile.skin_tone,
              stylePreference: profile.style_preference,
              bodyType: profile.body_type,
              preferredColors: profile.preferred_colors,
              fashionGoals: profile.fashion_goals,
            } : undefined,
          },
        });

        if (error) throw error;

        // Save outfit to DB
        const { data: outfitRow, error: outfitErr } = await supabase
          .from("outfits")
          .insert({
            user_id: user.id,
            occasion,
            reasoning: data.reasoning || "",
            style_tips: data.style_tips || null,
          })
          .select()
          .single();

        if (outfitErr || !outfitRow) throw outfitErr;

        const selectedItems: ClothingItem[] = data.items || [];
        // Save outfit_items junction
        if (selectedItems.length > 0) {
          await supabase.from("outfit_items").insert(
            selectedItems.map((si: ClothingItem) => ({
              outfit_id: outfitRow.id,
              clothing_item_id: si.id,
            }))
          );
        }

        const outfit: Outfit = {
          id: outfitRow.id,
          occasion,
          items: selectedItems,
          createdAt: new Date(outfitRow.created_at),
          reasoning: data.reasoning || "",
          styleTips: data.style_tips,
        };

        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      } catch (err) {
        console.error("AI outfit generation failed:", err);
        // Fallback
        const categories = [...new Set(items.map((i) => i.category))];
        const selected: ClothingItem[] = [];
        for (const cat of categories) {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length > 0) selected.push(catItems[Math.floor(Math.random() * catItems.length)]);
          if (selected.length >= 4) break;
        }
        const fallbackItems = selected.length >= 2 ? selected : [...items].sort(() => Math.random() - 0.5).slice(0, 3);

        const { data: outfitRow } = await supabase
          .from("outfits")
          .insert({
            user_id: user.id,
            occasion,
            reasoning: `A curated look for "${occasion}" combining complementary pieces.`,
          })
          .select()
          .single();

        if (outfitRow && fallbackItems.length > 0) {
          await supabase.from("outfit_items").insert(
            fallbackItems.map((si) => ({ outfit_id: outfitRow.id, clothing_item_id: si.id }))
          );
        }

        const outfit: Outfit = {
          id: outfitRow?.id || crypto.randomUUID(),
          occasion,
          items: fallbackItems,
          createdAt: new Date(),
          reasoning: `A curated look for "${occasion}" combining complementary pieces.`,
        };
        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      }
    },
    [user, items, profile]
  );

  return { items, outfits, addItem, removeItem, generateOutfit, loading };
}
