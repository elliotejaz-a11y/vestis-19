import { useState, useCallback } from "react";
import { ClothingItem, Outfit } from "@/types/wardrobe";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "wardrobe_items";

function loadItems(): ClothingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: ClothingItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useWardrobe() {
  const [items, setItems] = useState<ClothingItem[]>(loadItems);
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  const addItem = useCallback((item: ClothingItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      saveItems(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveItems(next);
      return next;
    });
  }, []);

  const generateOutfit = useCallback(
    async (occasion: string): Promise<Outfit | null> => {
      if (items.length < 2) return null;

      try {
        const { data, error } = await supabase.functions.invoke("generate-outfit", {
          body: { occasion, items },
        });

        if (error) throw error;

        const outfit: Outfit = {
          id: crypto.randomUUID(),
          occasion,
          items: data.items || [],
          createdAt: new Date(),
          reasoning: data.reasoning || "A curated look for this occasion.",
          styleTips: data.style_tips,
        };

        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      } catch (err) {
        console.error("AI outfit generation failed:", err);
        // Fallback to basic logic
        const categories = [...new Set(items.map((i) => i.category))];
        const selected: ClothingItem[] = [];
        for (const cat of categories) {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length > 0) {
            selected.push(catItems[Math.floor(Math.random() * catItems.length)]);
          }
          if (selected.length >= 4) break;
        }

        const fallbackItems = selected.length >= 2 ? selected : [...items].sort(() => Math.random() - 0.5).slice(0, 3);

        const outfit: Outfit = {
          id: crypto.randomUUID(),
          occasion,
          items: fallbackItems,
          createdAt: new Date(),
          reasoning: `A curated look for "${occasion}" combining complementary pieces from your wardrobe.`,
        };

        setOutfits((prev) => [outfit, ...prev]);
        return outfit;
      }
    },
    [items]
  );

  return { items, outfits, addItem, removeItem, generateOutfit };
}
