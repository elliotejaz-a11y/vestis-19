import type { ClothingItem, Outfit } from "@/types/wardrobe";

export type CategoryPredicate = (item: ClothingItem) => boolean;

/**
 * Counts how many of the last 5 outfits each item appeared in.
 * Used as a recency proxy: count=1 means worn once (least recently), count=3+ means chronic repeat.
 */
export function buildRecentIdCounts(recentOutfits: Outfit[]): Map<string, number> {
  const counts = new Map<string, number>();
  recentOutfits.slice(0, 5).forEach(o => {
    new Set((o.items || []).map(i => i.id)).forEach(id => {
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  });
  return counts;
}

/**
 * Returns true if the sorted item IDs of selectedItems exactly match any of the last 5 outfits.
 */
export function isExactDuplicateOfRecent(
  selectedItems: ClothingItem[],
  recentOutfits: Outfit[]
): boolean {
  if (selectedItems.length === 0) return false;
  const key = [...selectedItems.map(i => i.id)].sort().join(',');
  return recentOutfits.slice(0, 5).some(o => {
    const recentKey = [...(o.items || []).map(i => i.id)].sort().join(',');
    return recentKey !== '' && recentKey === key;
  });
}

/**
 * Phase-2 duplicate breaker: when Phase 1 (swap to a completely-fresh item) could not
 * break an exact outfit repeat, iterates each slot predicate in priority order and swaps
 * to the least-recently-worn alternative (lowest count in recentIdCounts, i.e. count=0
 * beats count=1 beats count=3). A single slot change is enough to break the exact match.
 * Returns the original array unchanged if no alternatives exist in any slot (truly minimal
 * wardrobe with only one possible combination).
 */
export function breakExactDuplicate(
  selectedItems: ClothingItem[],
  allItems: ClothingItem[],
  recentIdCounts: Map<string, number>,
  slotPredicates: CategoryPredicate[]
): ClothingItem[] {
  const currentIds = new Set(selectedItems.map(i => i.id));
  for (const predicate of slotPredicates) {
    const idx = selectedItems.findIndex(predicate);
    if (idx < 0) continue;
    const alternatives = allItems
      .filter(i => predicate(i) && i.id !== selectedItems[idx].id && !currentIds.has(i.id))
      .sort((a, b) => (recentIdCounts.get(a.id) || 0) - (recentIdCounts.get(b.id) || 0));
    const pick = alternatives[0];
    if (pick) {
      const updated = [...selectedItems];
      updated[idx] = pick;
      return updated;
    }
  }
  return selectedItems;
}
