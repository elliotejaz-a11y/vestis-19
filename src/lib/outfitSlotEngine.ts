/**
 * Deterministic slot resolution engine.
 *
 * Smoke-test scenarios (verified mentally):
 *
 * SCENARIO 1 — Warm (22°C, clear), "Casual day out", full wardrobe:
 *   needsJumper=false, needsOuterwear=false. Slots: top+bottom+shoes.
 *   candidates include tops(3-5), bottoms(3-5), shoes(3-5). No outerwear.
 *
 * SCENARIO 2 — Cold (12°C, clear), "Date night", full wardrobe:
 *   needsJumper=true, needsOuterwear=true (puffer preferred).
 *   Slots: top+bottom+jumper+outerwear+shoes.
 *
 * SCENARIO 3 — Rainy (18°C, rain), "Business meeting", full wardrobe:
 *   needsJumper=true (18°C in jumper range), needsOuterwear=true (rain).
 *   Waterproof outerwear preferred.
 *
 * SCENARIO 4 — Minimal wardrobe (1 top, 1 bottom, no shoes):
 *   Returns valid result with shoes slot absent. No error.
 *
 * SCENARIO 5 — Empty wardrobe (0 items):
 *   Returns error: missing_tops.
 */

import type { ClothingItem } from "@/types/wardrobe";
import { rankSlotCandidates, rankCombinations, inferColourStrategy } from "@/lib/colourTheory";
import { WARM_TEMP } from "@/lib/outfitConstants";

// ── Weather thresholds (slot-engine specific) ────────────────────────────────
// WARM_TEMP (19) is imported from outfitConstants — above this, no layering needed.
// PUFFER_TEMP is local — below this, a puffer/coat is required if available.
// MEDIUM: PUFFER_TEMP (15) differs from the edge function's COLD_THRESHOLD (10).
// At 11–15°C the slot engine marks needsPuffer=true and adds the outerwear slot, but the edge
// function legacy mode (gym path) says "Mild — light jacket optional". This only affects gym
// outfits (which strip outerwear anyway), so there is no visible user impact today. If COLD_THRESHOLD
// is ever raised in the edge function, or the legacy mode is extended, this will cause a mismatch.
// Fix: export PUFFER_TEMP from outfitConstants and import it in the edge function.
const PUFFER_TEMP = 15;

const PUFFER_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|down jacket|anorak|peacoat|overcoat|trench coat|duffel coat|wool coat|toggle coat|shearling|puffer coat|padded coat)\b/i;
const WATERPROOF_PATTERN = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex|mac|mackintosh|cagoule|pac[-\s]?a[-\s]?mac|hardshell|anorak)\b/i;
const RAIN_PATTERN = /\b(rain|rainy|drizzle|shower|showers|wet|precipitation|storm|stormy|downpour)\b/i;
const FORMAL_PATTERN = /\b(wedding|gala|black[-\s]?tie|formal|cocktail|funeral|opera)\b/i;
const BUSINESS_PATTERN = /\b(business|interview|meeting|office|work|corporate|conference|presentation)\b/i;
const GYM_PATTERN = /\b(gym|workout|training|exercise|fitness|run|running|jog|jogging|cardio|lift|lifting|weights?|pilates|yoga|sport|sports)\b/i;
const BEACH_PATTERN = /\b(beach|pool|swim|holiday|vacation|tropical|summer)\b/i;
const NIGHT_OUT_PATTERN = /\b(night out|party|club|bar|drinks|going out)\b/i;
const DATE_PATTERN = /\b(date|dinner|romantic|brunch)\b/i;

// ── Occasion-specific item exclusion patterns ────────────────────────────────
const OCCASION_GYM_WEAR_PATTERN = /\b(compression|activewear|athletic wear|performance top|training top|workout top|gym top|sports top|spandex|elastane|dry[-\s]?fit|moisture[-\s]?wicking)\b/i;
const OCCASION_HEAVY_COAT_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|down jacket|peacoat|overcoat|trench coat|duffel coat|wool coat|toggle coat|shearling)\b/i;
const OCCASION_FORMAL_SHOE_PATTERN = /\b(oxford|derby|derbies|brogue|court shoe|kitten heel|stiletto)\b/i;
const OCCASION_BRANDED_ATHLETIC_SHOE_PATTERN = /\b(TN|TNs|air ?max|air ?force|running shoe|trail shoe|training shoe|gym shoe|sports shoe|basketball shoe|tech runner|boost|ultra ?boost|foam ?runner)\b/i;
const OCCASION_TRACKSUIT_PATTERN = /\b(tracksuit|track ?pants?|sweatpants?)\b/i;

// Max candidates sent to AI per slot — keeps the prompt under the token budget
const MAX_CANDIDATES_PER_SLOT = 5;

// A jumper (or hoodie) counts as one layering piece. Outerwear (puffers, coats, jackets)
// is a separate category and does NOT count toward this limit.
const MAX_JUMPERS_PER_OUTFIT = 1;

export interface WeatherData {
  temp: number;
  description: string;
}

export interface SlotError {
  type: "missing_tops" | "missing_bottoms";
  message: string;
}

export interface WeatherRules {
  needsJumper: boolean;
  needsOuterwear: boolean;
  needsPuffer: boolean;
  isRaining: boolean;
  noOuterwear: boolean;
}

/** Candidates per slot, each list colour-ranked best-to-worst. */
export type CandidatesBySlot = Record<string, ClothingItem[]>;

export interface SlotResult {
  /** Items whose slot is forced by weather rules (e.g. only puffer, or only waterproof). */
  mandatoryItems: ClothingItem[];
  /** Colour-ranked candidates per slot for the AI to pick from. */
  candidatesBySlot: CandidatesBySlot;
  /** null when the wardrobe satisfies all required slots. */
  error: SlotError | null;
  /** Which weather rules triggered. */
  weatherRules: WeatherRules;
  /** Inferred colour story name for the best-ranking candidate combination (e.g. "tonal palette"). */
  colourStrategy?: string;
}

/**
 * Maps a ClothingItem category string to the slot key used in candidatesBySlot.
 * "tops" → "top", "bottoms" → "bottom", "dresses" → "top", "jumpers" → "jumper",
 * "hats" → "hat", "accessories" → "accessory", others pass through unchanged.
 */
function categoryToSlotKey(category: string): string {
  const cat = (category || '').toLowerCase();
  const MAP: Record<string, string> = {
    tops: 'top', dresses: 'top', bottoms: 'bottom',
    jumpers: 'jumper', hats: 'hat', accessories: 'accessory',
  };
  return MAP[cat] ?? cat;
}

function searchText(item: ClothingItem): string {
  return [item.name, item.category, item.color, item.fabric, item.notes, ...(item.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();
}

function isPuffer(item: ClothingItem): boolean {
  return PUFFER_PATTERN.test(searchText(item));
}

function isWaterproof(item: ClothingItem): boolean {
  return WATERPROOF_PATTERN.test(searchText(item));
}

// ── Occasion-based item filter ───────────────────────────────────────────────

function occSearchText(item: ClothingItem): string {
  return [item.name, item.category, item.color, item.fabric, item.notes, ...(item.tags || [])]
    .filter(Boolean).join(' ').toLowerCase();
}

function isOccasionGymWear(item: ClothingItem): boolean {
  const c = (item.category || '').toLowerCase();
  if (c !== 'tops' && c !== 'bottoms') return false;
  return OCCASION_GYM_WEAR_PATTERN.test(occSearchText(item));
}

function isOccasionBrandedAthleticShoe(item: ClothingItem): boolean {
  if ((item.category || '').toLowerCase() !== 'shoes') return false;
  return OCCASION_BRANDED_ATHLETIC_SHOE_PATTERN.test(occSearchText(item));
}

function isOccasionHeavyCoat(item: ClothingItem): boolean {
  if ((item.category || '').toLowerCase() !== 'outerwear') return false;
  return OCCASION_HEAVY_COAT_PATTERN.test(occSearchText(item));
}

function isOccasionFormalShoe(item: ClothingItem): boolean {
  if ((item.category || '').toLowerCase() !== 'shoes') return false;
  return OCCASION_FORMAL_SHOE_PATTERN.test(occSearchText(item));
}

function isOccasionTracksuit(item: ClothingItem): boolean {
  const c = (item.category || '').toLowerCase();
  if (c !== 'bottoms' && c !== 'tops') return false;
  return OCCASION_TRACKSUIT_PATTERN.test(occSearchText(item));
}

/**
 * Deterministically removes items that are definitively wrong for the occasion.
 * Runs before slot resolution so the AI never sees inappropriate candidates.
 *
 * Safety: if the filtered pool would leave no tops or no bottoms (e.g. wardrobe
 * is entirely gym-wear and occasion is formal), returns the full wardrobe unchanged.
 *
 * Exported so useWardrobe can build anchor candidates from the same filtered pool
 * before calling resolveSlots.
 */
export function filterItemsByOccasion(wardrobe: ClothingItem[], occasion: string): ClothingItem[] {
  let filtered: ClothingItem[];

  if (FORMAL_PATTERN.test(occasion)) {
    // Formal events + wedding guest: remove gym wear, branded athletic shoes, tracksuits.
    // Clean sneakers are allowed (streetwear-formal crossover). Only exclude sports-branded trainers.
    filtered = wardrobe.filter(
      i => !isOccasionGymWear(i) && !isOccasionBrandedAthleticShoe(i) && !isOccasionTracksuit(i)
    );
  } else if (BUSINESS_PATTERN.test(occasion)) {
    // Business / interview: exclude gym wear + branded athletic shoes.
    filtered = wardrobe.filter(i => !isOccasionGymWear(i) && !isOccasionBrandedAthleticShoe(i));
  } else if (BEACH_PATTERN.test(occasion)) {
    // Beach / vacation: exclude heavy coats and strict formal shoes.
    filtered = wardrobe.filter(i => !isOccasionHeavyCoat(i) && !isOccasionFormalShoe(i));
  } else if (NIGHT_OUT_PATTERN.test(occasion) || DATE_PATTERN.test(occasion)) {
    // Night out / party / date / brunch: exclude gym-specific activewear items.
    filtered = wardrobe.filter(i => !isOccasionGymWear(i));
  } else {
    // Casual and everything else: exclude gym activewear as a minimum.
    filtered = wardrobe.filter(i => !isOccasionGymWear(i));
  }

  // Safety: if filtering removed all tops or all bottoms, return the full wardrobe.
  const hasTops = filtered.some(i => {
    const c = (i.category || '').toLowerCase();
    return c === 'tops' || c === 'dresses';
  });
  const hasBottoms = filtered.some(i => {
    const c = (i.category || '').toLowerCase();
    return c === 'bottoms' || c === 'dresses';
  });
  return hasTops && hasBottoms ? filtered : wardrobe;
}

/** Builds weatherRules from a temperature + description pair. */
function computeWeatherRules(weather: WeatherData | null): WeatherRules {
  if (!weather) {
    return { needsJumper: false, needsOuterwear: false, needsPuffer: false, isRaining: false, noOuterwear: false };
  }
  const { temp, description } = weather;
  const isRaining = RAIN_PATTERN.test(description);
  const noOuterwear = temp > WARM_TEMP && !isRaining;
  // Jumper is relevant at any temp ≤ 19°C: mild (16–19°C) or cold (≤15°C)
  const needsJumper = temp <= WARM_TEMP;
  const needsPuffer = temp <= PUFFER_TEMP;
  const needsOuterwear = temp <= PUFFER_TEMP || isRaining;
  return { needsJumper, needsOuterwear, needsPuffer, isRaining, noOuterwear };
}

/**
 * Resolve which clothing slots are required / available and which items
 * are mandatory vs candidate for each slot.
 *
 * RULE 1: tops (or dresses) are ALWAYS required — error if wardrobe has neither.
 * RULE 2: bottoms are ALWAYS required (unless a dress is selected, handled in AI prompt).
 *         Error if wardrobe has neither bottoms nor dresses.
 * RULE 3: jumpers are ADDITIVE — placed on top of a shirt, never substituting it.
 *         tops ≠ jumpers. The "top" slot only accepts category === "tops".
 * RULE 4: outerwear is ADDITIVE (same logic as Rule 3).
 * RULE 5: shoes are optional but always included if available.
 * RULE 6: hats/accessories are optional and excluded for formal/business occasions.
 */
export function resolveSlots(
  wardrobe: ClothingItem[],
  weather: WeatherData | null,
  occasion: string,
  mandatoryAnchor?: ClothingItem,
): SlotResult {
  const cat = (item: ClothingItem) => (item.category || '').toLowerCase();

  // Apply deterministic occasion filter before building any slot candidates.
  // Gym occasions are handled by a separate path in useWardrobe and never reach here.
  const pool = filterItemsByOccasion(wardrobe, occasion);

  const tops        = pool.filter(i => cat(i) === 'tops');
  const dresses     = pool.filter(i => cat(i) === 'dresses');
  const bottoms     = pool.filter(i => cat(i) === 'bottoms');
  const jumpers     = pool.filter(i => cat(i) === 'jumpers');
  const outerwear   = pool.filter(i => cat(i) === 'outerwear');
  const shoes       = pool.filter(i => cat(i) === 'shoes');
  const hats        = pool.filter(i => cat(i) === 'hats');
  const accessories = pool.filter(i => cat(i) === 'accessories');

  const isGym     = GYM_PATTERN.test(occasion);
  const isFormal  = FORMAL_PATTERN.test(occasion);
  const isBusiness = BUSINESS_PATTERN.test(occasion);
  const isFormalOrBusiness = isFormal || isBusiness;

  const weatherRules = computeWeatherRules(weather);

  // ── RULE 1: tops required (dresses count) ────────────────────────────────
  if (tops.length === 0 && dresses.length === 0) {
    return {
      mandatoryItems: [],
      candidatesBySlot: {},
      error: { type: 'missing_tops', message: 'Add some tops to your wardrobe to get outfit suggestions.' },
      weatherRules,
    };
  }

  // ── RULE 2: bottoms required (dresses count as a substitute) ─────────────
  if (bottoms.length === 0 && dresses.length === 0) {
    return {
      mandatoryItems: [],
      candidatesBySlot: {},
      error: { type: 'missing_bottoms', message: 'Add some bottoms to your wardrobe to get outfit suggestions.' },
      weatherRules,
    };
  }

  // ── Build slot candidates ─────────────────────────────────────────────────
  const candidatesBySlot: CandidatesBySlot = {};
  const mandatoryItems: ClothingItem[] = [];

  // Tops slot: always present (tops + dresses as full-coverage option).
  // When a mandatory anchor has been pre-selected algorithmically, restrict this
  // slot to only that item so the colour ranking and AI prompt both align with it.
  const topCandidates = [...tops, ...dresses];
  candidatesBySlot.top = mandatoryAnchor ? [mandatoryAnchor] : topCandidates;

  // Bottoms slot (skip if only dresses available — the AI prompt explains this)
  if (bottoms.length > 0) {
    candidatesBySlot.bottom = bottoms;
  }

  // Jumper slot: additive (RULE 3 — never replaces the top slot).
  // MAX_JUMPERS_PER_OUTFIT = 1: if the mandatory anchor is already a jumper, it occupies
  // the one allowed jumper position (placed in the top slot above). Adding a second jumper
  // slot would let the AI pick two jumpers/hoodies, so we skip it in that case.
  // Outerwear (puffers, coats, jackets) is a separate category and has no such limit.
  const anchorIsJumper = mandatoryAnchor != null && (mandatoryAnchor.category || '').toLowerCase() === 'jumpers';
  const { needsJumper, needsOuterwear, needsPuffer, isRaining, noOuterwear } = weatherRules;
  if (!isGym && !anchorIsJumper && jumpers.length > 0 && (needsJumper || (weather?.temp ?? 20) <= PUFFER_TEMP)) {
    candidatesBySlot.jumper = jumpers;
  }

  // Outerwear slot: additive (RULE 4 — layers over shirt [+ jumper])
  if (!isGym && !noOuterwear && outerwear.length > 0 && needsOuterwear) {
    let outerwearPool = outerwear;
    if (needsPuffer) {
      const puffers = outerwear.filter(isPuffer);
      if (puffers.length > 0) {
        // Force the puffer — single mandatory item
        if (puffers.length === 1) {
          mandatoryItems.push(puffers[0]);
        } else {
          outerwearPool = puffers;
        }
      }
      // If no puffer found, fall back to all outerwear
    } else if (isRaining) {
      const waterproofs = outerwear.filter(isWaterproof);
      if (waterproofs.length === 1) {
        mandatoryItems.push(waterproofs[0]);
      } else if (waterproofs.length > 0) {
        outerwearPool = waterproofs;
      }
      // If no waterproof, use all outerwear
    }
    // Only add outerwear to candidatesBySlot if it's not already fully covered by a single mandatory item
    const alreadyMandatory = mandatoryItems.some(m => (m.category || '').toLowerCase() === 'outerwear');
    if (!alreadyMandatory) {
      candidatesBySlot.outerwear = outerwearPool;
    }
  }

  // Shoes slot: always include if available (RULE 5)
  if (shoes.length > 0) {
    candidatesBySlot.shoes = shoes;
  }

  // Hat slot: optional, excluded for formal/business (RULE 6)
  if (!isGym && !isFormalOrBusiness && hats.length > 0) {
    candidatesBySlot.hat = hats;
  }

  // Accessories: optional, excluded for gym
  if (!isGym && accessories.length > 0) {
    candidatesBySlot.accessory = accessories;
  }

  // ── Colour-rank each slot's candidates ───────────────────────────────────────
  // Strategy A (mandatory items exist): rank each slot against weather-forced anchor(s)
  //   e.g. if the puffer is mandatory, rank all other slots relative to it.
  // Strategy B (no mandatory items — the common case): use rankCombinations() on the
  //   three core visual slots (top / bottom / shoes) to find the highest-scoring colour
  //   combination, then rank every slot's candidates against the other core slots' best
  //   items. This is what makes the #1 candidate in each slot "work together" as an outfit.
  const ranked: CandidatesBySlot = {};
  let colourStrategy: string | undefined;

  if (mandatoryItems.length > 0) {
    for (const [slot, candidates] of Object.entries(candidatesBySlot)) {
      const anchors = mandatoryItems.filter(
        m => categoryToSlotKey((m.category || '').toLowerCase()) !== slot
      );
      ranked[slot] = rankSlotCandidates(candidates, anchors).slice(0, MAX_CANDIDATES_PER_SLOT);
    }
  } else {
    // Build core slot candidates for combination ranking (bounded: ≤3 slots × 3 items = 27)
    const CORE_SLOTS = ['top', 'bottom', 'shoes'];
    const coreForRanking: Record<string, ClothingItem[]> = {};
    for (const s of CORE_SLOTS) {
      if (candidatesBySlot[s]?.length > 0) coreForRanking[s] = candidatesBySlot[s];
    }

    const topCombos = rankCombinations(coreForRanking, 3, 1);

    if (topCombos.length > 0) {
      const bestItems = topCombos[0].items;
      colourStrategy = inferColourStrategy(bestItems);
      // Rank each slot using the other core slots' best items as colour anchors
      for (const [slot, candidates] of Object.entries(candidatesBySlot)) {
        const crossAnchors = bestItems.filter(
          i => categoryToSlotKey((i.category || '').toLowerCase()) !== slot
        );
        ranked[slot] = rankSlotCandidates(candidates, crossAnchors).slice(0, MAX_CANDIDATES_PER_SLOT);
      }
    } else {
      // Sparse wardrobe (missing core slots) — preserve original order
      for (const [slot, candidates] of Object.entries(candidatesBySlot)) {
        ranked[slot] = candidates.slice(0, MAX_CANDIDATES_PER_SLOT);
      }
    }
  }

  return { mandatoryItems, candidatesBySlot: ranked, error: null, weatherRules, colourStrategy };
}

/** Produce a no-AI fallback outfit from the slot result (Fallback Level 2). */
export function buildFallbackOutfit(
  slotResult: SlotResult,
  allItems: ClothingItem[]
): ClothingItem[] {
  const { mandatoryItems, candidatesBySlot } = slotResult;
  const chosen: ClothingItem[] = [...mandatoryItems];
  const usedIds = new Set(chosen.map(i => i.id));

  // Priority order for required slots
  const priority = ['top', 'bottom', 'jumper', 'outerwear', 'shoes', 'hat', 'accessory'];
  for (const slot of priority) {
    const candidates = candidatesBySlot[slot] || [];
    const pick = candidates.find(c => !usedIds.has(c.id));
    if (pick) {
      chosen.push(pick);
      usedIds.add(pick.id);
    }
  }

  // Ensure top is present even if slot engine didn't get one (safety net)
  const hasTops = chosen.some(i => (i.category || '').toLowerCase() === 'tops' || (i.category || '').toLowerCase() === 'dresses');
  if (!hasTops) {
    const fallbackTop = allItems.find(i => (i.category || '').toLowerCase() === 'tops' || (i.category || '').toLowerCase() === 'dresses');
    if (fallbackTop && !usedIds.has(fallbackTop.id)) chosen.push(fallbackTop);
  }

  // Ensure bottoms present
  const hasBottoms = chosen.some(i => (i.category || '').toLowerCase() === 'bottoms');
  const hasDress = chosen.some(i => (i.category || '').toLowerCase() === 'dresses');
  if (!hasBottoms && !hasDress) {
    const fallbackBottom = allItems.find(i => (i.category || '').toLowerCase() === 'bottoms');
    if (fallbackBottom && !usedIds.has(fallbackBottom.id)) chosen.push(fallbackBottom);
  }

  return chosen;
}
