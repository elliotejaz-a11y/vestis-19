import type { ClothingItem, Outfit } from "@/types/wardrobe";

export type CategoryPredicate = (item: ClothingItem) => boolean;

/** Colour words that pair safely with almost any other colour. */
const NEUTRALS = new Set([
  'black', 'charcoal', 'white', 'off-white', 'cream', 'ivory',
  'grey', 'gray', 'silver', 'navy', 'beige', 'tan', 'camel',
  'brown', 'sand', 'stone', 'khaki',
]);

function getColorWords(color: string): string[] {
  return color.toLowerCase().split(/[,\s\/\-]+/).filter(Boolean);
}

/**
 * Scores how well a candidate item's colour pairs with the outfit's top (1–3).
 * 3 = same colour family (shared word — tonal/monochromatic),
 * 2 = safe neutral pairing (at least one side is a neutral),
 * 1 = no obvious compatibility signal.
 * Used as a recency tiebreaker in breakExactDuplicate: when two alternatives
 * have the same recency count, prefer the one that better matches the colour story.
 */
export function colourCompatibilityScore(candidate: ClothingItem, selectedItems: ClothingItem[]): number {
  const top = selectedItems.find(i => {
    const cat = (i.category || '').toLowerCase();
    return cat === 'tops' || cat === 'jumpers';
  });
  if (!top?.color || !candidate.color) return 1;

  const topWords = getColorWords(top.color);
  const candWords = getColorWords(candidate.color);
  const topIsNeutral = topWords.some(w => NEUTRALS.has(w));
  const candIsNeutral = candWords.some(w => NEUTRALS.has(w));
  // Shared word covers tonal ("navy blue" + "navy chino") and monochrome ("black" + "black")
  const sharedWord = topWords.some(t => candWords.some(c => t === c || t.includes(c) || c.includes(t)));

  if (sharedWord) return 3;
  if (topIsNeutral || candIsNeutral) return 2;
  return 1;
}

/**
 * Counts how many of the last 5 outfits each item appeared in.
 * Used as a recency proxy: count=1 means worn once recently, count=3+ is a chronic repeat.
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
 * Phase-2 duplicate breaker: when the edge function still returns an exact outfit repeat,
 * iterates each slot predicate in priority order (bottom → shoe → top) and swaps to the
 * least-recently-worn, most colour-compatible alternative. Tries every candidate in a slot
 * before falling through — skipping picks that would themselves be duplicates of a recent
 * outfit. Returns the original array unchanged only when the wardrobe has exactly one
 * possible combination (no alternatives exist in any slot).
 */
export function breakExactDuplicate(
  selectedItems: ClothingItem[],
  allItems: ClothingItem[],
  recentIdCounts: Map<string, number>,
  slotPredicates: CategoryPredicate[],
  recentOutfits?: Outfit[]
): ClothingItem[] {
  const currentIds = new Set(selectedItems.map(i => i.id));
  for (const predicate of slotPredicates) {
    const idx = selectedItems.findIndex(predicate);
    if (idx < 0) continue;
    const alternatives = allItems
      .filter(i => predicate(i) && i.id !== selectedItems[idx].id && !currentIds.has(i.id))
      .sort((a, b) => {
        const recencyDiff = (recentIdCounts.get(a.id) || 0) - (recentIdCounts.get(b.id) || 0);
        if (recencyDiff !== 0) return recencyDiff;
        // Equal recency: prefer the item whose colour pairs better with the existing top.
        return colourCompatibilityScore(b, selectedItems) - colourCompatibilityScore(a, selectedItems);
      });
    for (const pick of alternatives) {
      const updated = [...selectedItems];
      updated[idx] = pick;
      // Skip this pick if it would itself recreate a known duplicate.
      if (recentOutfits && isExactDuplicateOfRecent(updated, recentOutfits)) continue;
      return updated;
    }
    // Every alternative in this slot would also be a duplicate — fall through to next slot.
  }
  return selectedItems;
}
