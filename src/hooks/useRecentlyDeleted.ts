import { useState, useCallback, useEffect } from "react";
import { ClothingItem } from "@/types/wardrobe";

const STORAGE_KEY = "vestis_recently_deleted";
const MAX_AGE_DAYS = 30;

export interface DeletedItem extends ClothingItem {
  deletedAt: string;
}

export function useRecentlyDeleted() {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: DeletedItem[] = JSON.parse(stored);
        const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const valid = parsed.filter((item) => item.deletedAt > cutoff);
        setDeletedItems(valid);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      } catch {
        setDeletedItems([]);
      }
    }
  }, []);

  const addToDeleted = useCallback((item: ClothingItem) => {
    const deletedItem: DeletedItem = { ...item, deletedAt: new Date().toISOString() };
    setDeletedItems((prev) => {
      const next = [deletedItem, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromDeleted = useCallback((id: string) => {
    setDeletedItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getItemById = useCallback((id: string) => {
    return deletedItems.find((item) => item.id === id) || null;
  }, [deletedItems]);

  return { deletedItems, addToDeleted, removeFromDeleted, getItemById };
}
