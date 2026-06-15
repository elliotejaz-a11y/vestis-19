/** Shared constants for the outfit generation pipeline. */

/** How many recent outfits to check for similarity/repetition. */
export const RECENT_OUTFIT_SIMILARITY_WINDOW = 5;

/**
 * Minimum number of shared items across ALL slots that makes two outfits
 * "too similar". Raised to 3 because anchor pre-selection already prevents
 * same-top repeats; some accessory/shoe overlap in a small wardrobe is fine.
 */
export const CORE_SIMILARITY_THRESHOLD = 3;

/** Sentinel value for the colour story picker — "let the AI decide". */
export const COLOUR_STORY_SURPRISE = 'surprise';

/**
 * Temperature thresholds (°C) used by the outfit generation pipeline.
 * WARM_TEMP: above this, no jumper/outerwear needed (unless rain).
 * COLD_TEMP: below this, inject outerwear into fallback selections.
 * HOT_TEMP:  above this, strip heavy outerwear from candidates.
 */
export const WARM_TEMP = 19;
export const COLD_TEMP = 10;
export const HOT_TEMP = 25;

// ── Anchor pre-selection constants ───────────────────────────────────────────

/** Categories that define visual identity — eligible for algorithmic anchor selection. */
export const ANCHOR_SLOTS = ['tops', 'jumpers', 'dresses'] as const;
export type AnchorSlot = typeof ANCHOR_SLOTS[number];

/** How many recent outfits to consider when scoring anchor candidates. */
export const ANCHOR_RECENCY_WINDOW = 5;

/**
 * Relative weights for weighted-random anchor selection by recency position.
 * Index = position in the most-recent-first ordered anchor history.
 * 0 = worn in the last outfit (strongly avoid), 5 = not worn in last 5 (full weight).
 */
export const ANCHOR_RECENCY_SCORES: readonly number[] = [
  0.0,  // worn last outfit — excluded unless no alternatives
  0.10, // worn 2 outfits ago
  0.35, // worn 3 outfits ago
  0.65, // worn 4 outfits ago
  0.85, // worn 5 outfits ago
  1.0,  // not worn in last 5 — full weight
] as const;
