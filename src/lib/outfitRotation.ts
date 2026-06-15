import type { ClothingItem, Outfit } from "@/types/wardrobe";
import {
  CORE_SIMILARITY_THRESHOLD,
  RECENT_OUTFIT_SIMILARITY_WINDOW,
  ANCHOR_SLOTS,
  ANCHOR_RECENCY_WINDOW,
  ANCHOR_RECENCY_SCORES,
} from "@/lib/outfitConstants";
import type { AnchorSlot } from "@/lib/outfitConstants";

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

// ── Anchor pre-selection ─────────────────────────────────────────────────────

type MinimalOutfit = { items: Pick<ClothingItem, 'id'>[] };

/**
 * Algorithmically selects the primary garment (top/jumper/dress) for the next
 * outfit using recency-weighted random selection. Removes the top-selection
 * decision from the AI, which cannot reliably honour negative constraints.
 *
 * Selection logic:
 * - Each candidate gets a weight from ANCHOR_RECENCY_SCORES based on how
 *   recently it appeared as the anchor in saved outfits.
 * - Weighted random draw strongly deprioritises recent items without
 *   permanently banning them — items return to full weight after 5 outfits.
 * - If all candidates have zero weight (single-item wardrobe edge case),
 *   falls back to the least-recently-worn item.
 *
 * @param candidates      - Occasion-filtered top/jumper/dress ClothingItems.
 * @param recentOutfits   - Recent saved outfits, most recent first (id only).
 * @param allWardrobeItems - Full wardrobe; used to resolve category from item id.
 * @returns The selected anchor ClothingItem, or null if candidates is empty.
 */
export function selectAnchorItem(
  candidates: ClothingItem[],
  recentOutfits: MinimalOutfit[],
  allWardrobeItems: ClothingItem[],
): ClothingItem | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Build a fast id → category lookup from the full wardrobe
  const wardrobeById = new Map(allWardrobeItems.map(i => [i.id, i]));

  // Walk recent outfits most-recent-first and find each one's anchor item
  const recentAnchorIds: string[] = [];
  for (const outfit of recentOutfits.slice(0, ANCHOR_RECENCY_WINDOW)) {
    for (const oi of (outfit.items || [])) {
      const wardrobeItem = wardrobeById.get(oi.id);
      if (wardrobeItem && ANCHOR_SLOTS.includes((wardrobeItem.category || '').toLowerCase() as AnchorSlot)) {
        recentAnchorIds.push(oi.id);
        break; // one anchor per outfit
      }
    }
  }

  // Assign a recency-based weight to each candidate
  const candidateScores = candidates.map((item) => {
    const recencyIndex = recentAnchorIds.indexOf(item.id);
    const score = recencyIndex === -1
      ? ANCHOR_RECENCY_SCORES[ANCHOR_RECENCY_SCORES.length - 1] // not recently worn
      : (ANCHOR_RECENCY_SCORES[recencyIndex] ?? 0.0);
    return { item, score };
  });

  const totalScore = candidateScores.reduce((sum, c) => sum + c.score, 0);

  // Fallback: all candidates have weight 0 (only possible if exactly 1 candidate
  // was worn last outfit AND candidates.length === 1, but we return early above).
  // Kept for defensive completeness — pick least-recently-worn.
  if (totalScore === 0) {
    return [...candidates].sort((a, b) => {
      const ia = recentAnchorIds.lastIndexOf(a.id);
      const ib = recentAnchorIds.lastIndexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return -1; // not in recent = prefer
      if (ib === -1) return 1;
      return ib - ia; // higher index = worn longer ago = prefer
    })[0];
  }

  // Weighted random draw
  let rand = Math.random() * totalScore;
  for (const { item, score } of candidateScores) {
    rand -= score;
    if (rand <= 0) return item;
  }
  return candidateScores[candidateScores.length - 1].item; // floating-point safety
}

// ── Coordinated similarity check ─────────────────────────────────────────────

function isCoreTop(item: ClothingItem): boolean {
  const cat = (item.category || '').toLowerCase();
  return cat === 'tops' || cat === 'jumpers' || cat === 'dresses';
}
function isCoreBottom(item: ClothingItem): boolean {
  return (item.category || '').toLowerCase() === 'bottoms';
}
function isCoreShoe(item: ClothingItem): boolean {
  return (item.category || '').toLowerCase() === 'shoes';
}

/**
 * Counts how many of the three core outfit slots (top/jumper/dress, bottom, shoes)
 * are shared between two item arrays, compared by item ID.
 */
export function countSharedCoreItems(
  items1: ClothingItem[],
  items2: Pick<ClothingItem, 'id'>[]
): number {
  const ids2 = new Set(items2.map(i => i.id));
  let shared = 0;
  for (const pred of [isCoreTop, isCoreBottom, isCoreShoe] as ((i: ClothingItem) => boolean)[]) {
    const match = items1.find(pred);
    if (match && ids2.has(match.id)) shared++;
  }
  return shared;
}

/**
 * Post-generation safety net. Returns true if the proposed outfit is too similar
 * to a recent outfit that the user would experience it as a repeat.
 *
 * Rule 1 — Same anchor (top/jumper/dress) as any of the last 3 outfits.
 *   Should rarely fire when selectAnchorItem is working correctly. If it does,
 *   the AI ignored the mandatory anchor instruction — the retry loop handles it.
 *
 * Rule 2 — 3+ items shared across ALL slots with any of the last 5 outfits.
 *   Threshold raised from 2 to 3: some shoe/accessory repetition is natural with
 *   a small wardrobe, and anchor pre-selection already prevents the primary visual repeat.
 */
export function isTooSimilarToRecent(
  selectedItems: ClothingItem[],
  recentOutfits: MinimalOutfit[],
): boolean {
  const anchor = selectedItems.find(i =>
    ANCHOR_SLOTS.includes((i.category || '').toLowerCase() as AnchorSlot)
  );

  // Rule 1: same anchor as any of the last 3 outfits
  if (anchor) {
    const last3 = recentOutfits.slice(0, 3);
    if (last3.some(o => (o.items || []).some(oi => oi.id === anchor.id))) {
      console.warn('[outfit-gen] isTooSimilarToRecent Rule 1: anchor repeated in last 3 outfits');
      return true;
    }
  }

  // Rule 2: 3+ shared items across all slots with any of the last 5 outfits
  return recentOutfits.slice(0, RECENT_OUTFIT_SIMILARITY_WINDOW).some(o => {
    const recentIds = new Set((o.items || []).map(i => i.id));
    const sharedCount = selectedItems.filter(i => recentIds.has(i.id)).length;
    return sharedCount >= CORE_SIMILARITY_THRESHOLD;
  });
}
