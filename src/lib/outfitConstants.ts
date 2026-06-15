/** Shared constants for the outfit generation pipeline. */

/** How many recent outfits to check for similarity/repetition. */
export const RECENT_OUTFIT_SIMILARITY_WINDOW = 5;

/**
 * Number of shared core-slot items (top, bottom, shoes) that makes
 * two outfits "too similar". Sharing 2 out of 3 core pieces is unacceptable.
 */
export const CORE_SIMILARITY_THRESHOLD = 2;

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
