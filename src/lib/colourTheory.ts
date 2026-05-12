import type { ClothingItem } from "@/types/wardrobe";

/**
 * Colour words treated as neutrals — pair safely with almost anything.
 */
export const NEUTRALS = new Set([
  'black', 'white', 'grey', 'gray', 'navy', 'beige', 'cream', 'tan', 'camel',
  'olive', 'brown', 'charcoal', 'ivory', 'off-white', 'sand', 'stone', 'khaki',
  'silver', 'mushroom', 'ecru', 'nude', 'taupe', 'chocolate',
]);

/**
 * Complementary/classic pairs that score HIGH (82/100).
 * Each entry [a, b] is order-independent.
 */
export const COMPLEMENTARY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['navy', 'orange'],
  ['navy', 'rust'],
  ['navy', 'white'],
  ['navy', 'cream'],
  ['black', 'white'],
  ['black', 'cream'],
  ['black', 'red'],
  ['grey', 'burgundy'],
  ['grey', 'navy'],
  ['grey', 'pink'],
  ['brown', 'blue'],
  ['brown', 'camel'],
  ['olive', 'burgundy'],
  ['olive', 'rust'],
  ['olive', 'orange'],
  ['camel', 'white'],
  ['camel', 'navy'],
  ['camel', 'black'],
  ['burgundy', 'grey'],
  ['green', 'brown'],
  ['green', 'tan'],
  ['cobalt', 'rust'],
  ['blue', 'white'],
  ['blue', 'tan'],
  ['cream', 'black'],
  ['cream', 'brown'],
  ['cream', 'navy'],
  ['teal', 'rust'],
  ['teal', 'orange'],
  ['mustard', 'navy'],
  ['mustard', 'grey'],
];

/**
 * Clashing pairs that score LOW (15/100).
 * Order-independent.
 */
export const CLASHING_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['red', 'green'],
  ['orange', 'purple'],
  ['yellow', 'purple'],
  ['pink', 'orange'],
  ['red', 'pink'],
  ['neon', 'neon'],
  ['yellow', 'green'],
];

export interface RankedCombination {
  items: ClothingItem[];
  score: number;
}

/** Extract lowercase colour words from a colour string. */
function colourWords(color: string): string[] {
  return (color || '').toLowerCase().split(/[,\s/\-]+/).filter(w => w.length > 1);
}

/** Return true if any colour word in the string is a recognised neutral. */
export function isNeutralColor(color: string): boolean {
  return colourWords(color).some(w => NEUTRALS.has(w));
}

/**
 * Score how well two colour strings pair together (0–100).
 *
 * 90 — Monochromatic: exact shared colour word (black+black, navy+navy)
 * 80 — Tonal: partial/substring overlap (navy blue + navy chino)
 * 82 — Complementary: known good pair (navy+white, olive+burgundy)
 * 75 — Both neutrals: (black+grey, cream+beige)
 * 65 — One neutral + one non-neutral: safe classic contrast
 * 50 — Unknown pairing with no signals
 * 15 — Known clashing pair (red+green, orange+purple)
 */
export function colourScore(color1: string, color2: string): number {
  const w1 = colourWords(color1);
  const w2 = colourWords(color2);
  if (w1.length === 0 || w2.length === 0) return 50;

  // Monochromatic: exact shared word
  if (w1.some(a => w2.some(b => a === b))) return 90;

  // Tonal: substring overlap (e.g. "navy" in "navy blue")
  const tonal = w1.some(a => w2.some(b => a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a))));
  if (tonal) return 80;

  const set1 = new Set(w1);
  const set2 = new Set(w2);

  // Clashing pairs — check before complementary so we don't accidentally score high
  for (const [a, b] of CLASHING_PAIRS) {
    if ((set1.has(a) && set2.has(b)) || (set1.has(b) && set2.has(a))) return 15;
  }

  // Complementary pairs
  for (const [a, b] of COMPLEMENTARY_PAIRS) {
    if ((set1.has(a) && set2.has(b)) || (set1.has(b) && set2.has(a))) return 82;
  }

  const n1 = w1.some(w => NEUTRALS.has(w));
  const n2 = w2.some(w => NEUTRALS.has(w));

  // Both neutrals
  if (n1 && n2) return 75;

  // One neutral: safe classic contrast
  if (n1 || n2) return 65;

  return 50;
}

/**
 * Score a complete outfit combination by averaging all pairwise colour scores.
 * Only considers visible garment slots (not accessories/hats in the score average).
 */
export function scoreOutfitCombination(items: ClothingItem[]): number {
  const garments = items.filter(i => {
    const cat = (i.category || '').toLowerCase();
    return cat !== 'accessories' && cat !== 'hats';
  });
  if (garments.length < 2) return 50;

  let total = 0;
  let pairs = 0;
  for (let i = 0; i < garments.length; i++) {
    for (let j = i + 1; j < garments.length; j++) {
      total += colourScore(garments[i].color || '', garments[j].color || '');
      pairs++;
    }
  }
  return Math.round(total / pairs);
}

/**
 * Given a map of slot → candidate items, rank all combinations by colour score
 * and return the top results. Limits each slot to maxPerSlot candidates before
 * forming the Cartesian product to keep computation bounded.
 */
export function rankCombinations(
  candidatesBySlot: Record<string, ClothingItem[]>,
  maxPerSlot = 4,
  maxResults = 5
): RankedCombination[] {
  const slotNames = Object.keys(candidatesBySlot).filter(s => (candidatesBySlot[s] || []).length > 0);
  if (slotNames.length === 0) return [];

  const limitedSlots = slotNames.map(slot => (candidatesBySlot[slot] || []).slice(0, maxPerSlot));

  // Cartesian product — bounded: 4 slots × 4 items = 256 max combinations
  const combinations: ClothingItem[][] = limitedSlots.reduce<ClothingItem[][]>(
    (acc, slotItems) => acc.flatMap(combo => slotItems.map(item => [...combo, item])),
    [[]]
  );

  const ranked = combinations.map(items => ({ items, score: scoreOutfitCombination(items) }));
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, maxResults);
}

/**
 * For a single slot with multiple candidates, rank each candidate by its
 * colour compatibility with the "anchor" items (items already confirmed for other slots).
 * Returns the slot candidates re-ordered best-to-worst.
 */
export function rankSlotCandidates(
  candidates: ClothingItem[],
  anchors: ClothingItem[]
): ClothingItem[] {
  if (anchors.length === 0) return candidates;
  const anchorColors = anchors.map(a => a.color || '').filter(Boolean);

  const scored = candidates.map(candidate => {
    const scores = anchorColors.map(ac => colourScore(candidate.color || '', ac));
    const avg = scores.reduce((s, v) => s + v, 0) / (scores.length || 1);
    return { candidate, avg };
  });
  scored.sort((a, b) => b.avg - a.avg);
  return scored.map(s => s.candidate);
}
