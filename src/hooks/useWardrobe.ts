import { useState, useCallback } from "react";
import { ClothingItem, Outfit } from "@/types/wardrobe";

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
    (occasion: string): Outfit | null => {
      if (items.length < 2) return null;

      // Simple mock AI logic — picks items from different categories
      const categories = [...new Set(items.map((i) => i.category))];
      const selected: ClothingItem[] = [];

      for (const cat of categories) {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length > 0) {
          selected.push(catItems[Math.floor(Math.random() * catItems.length)]);
        }
        if (selected.length >= 4) break;
      }

      if (selected.length < 2) {
        // fallback: pick 2-3 random
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        return {
          id: crypto.randomUUID(),
          occasion,
          items: shuffled.slice(0, Math.min(3, shuffled.length)),
          createdAt: new Date(),
          reasoning: `A curated look for "${occasion}" combining complementary pieces from your wardrobe.`,
        };
      }

      const outfit: Outfit = {
        id: crypto.randomUUID(),
        occasion,
        items: selected,
        createdAt: new Date(),
        reasoning: `For "${occasion}", we selected pieces that complement each other in color and style, ensuring a polished and appropriate look.`,
      };

      setOutfits((prev) => [outfit, ...prev]);
      return outfit;
    },
    [items]
  );

  return { items, outfits, addItem, removeItem, generateOutfit };
}
