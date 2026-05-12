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
import { rankSlotCandidates } from "@/lib/colourTheory";

// ── Weather thresholds (new spec) ────────────────────────────────────────────
const WARM_TEMP = 19;   // above → no jumper/outerwear unless rain
const JUMPER_TEMP = 16; // 16–19°C → jumper recommended if available
const COLD_TEMP = 15;   // ≤15°C → jumper + puffer/coat required if available

const PUFFER_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|down jacket|anorak|peacoat|overcoat|trench coat|duffel coat|wool coat|toggle coat|shearling|puffer coat|padded coat)\b/i;
const WATERPROOF_PATTERN = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex|mac|mackintosh|cagoule|pac[-\s]?a[-\s]?mac|hardshell|anorak)\b/i;
const RAIN_PATTERN = /\b(rain|rainy|drizzle|shower|showers|wet|precipitation|storm|stormy|downpour)\b/i;
const FORMAL_PATTERN = /\b(wedding|gala|black[-\s]?tie|formal|cocktail|funeral|opera)\b/i;
const BUSINESS_PATTERN = /\b(business|interview|meeting|office|work|corporate|conference|presentation)\b/i;
const GYM_PATTERN = /\b(gym|workout|training|exercise|fitness|run|running|jog|jogging|cardio|lift|lifting|weights?|pilates|yoga|sport|sports)\b/i;

// Max candidates sent to AI per slot — keeps the prompt under the token budget
const MAX_CANDIDATES_PER_SLOT = 5;

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
  const needsPuffer = temp <= COLD_TEMP;
  const needsOuterwear = temp <= COLD_TEMP || isRaining;
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
  occasion: string
): SlotResult {
  const cat = (item: ClothingItem) => (item.category || '').toLowerCase();

  const tops        = wardrobe.filter(i => cat(i) === 'tops');
  const dresses     = wardrobe.filter(i => cat(i) === 'dresses');
  const bottoms     = wardrobe.filter(i => cat(i) === 'bottoms');
  const jumpers     = wardrobe.filter(i => cat(i) === 'jumpers');
  const outerwear   = wardrobe.filter(i => cat(i) === 'outerwear');
  const shoes       = wardrobe.filter(i => cat(i) === 'shoes');
  const hats        = wardrobe.filter(i => cat(i) === 'hats');
  const accessories = wardrobe.filter(i => cat(i) === 'accessories');

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

  // Tops slot: always present (tops + dresses as full-coverage option)
  const topCandidates = [...tops, ...dresses];
  candidatesBySlot.top = topCandidates;

  // Bottoms slot (skip if only dresses available — the AI prompt explains this)
  if (bottoms.length > 0) {
    candidatesBySlot.bottom = bottoms;
  }

  // Jumper slot: additive (RULE 3 — never replaces the top slot)
  // Trigger: temp 16–19°C OR temp ≤ 15°C, and jumpers exist
  const { needsJumper, needsOuterwear, needsPuffer, isRaining, noOuterwear } = weatherRules;
  if (!isGym && jumpers.length > 0 && (needsJumper || (weather?.temp ?? 20) <= COLD_TEMP)) {
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

  // ── Colour-rank each slot's candidates against all other confirmed items ──
  // Use mandatory items as anchors; rank each slot against them.
  const ranked: CandidatesBySlot = {};
  for (const [slot, candidates] of Object.entries(candidatesBySlot)) {
    const anchors = mandatoryItems.filter(m => (m.category || '').toLowerCase() !== slot);
    ranked[slot] = rankSlotCandidates(candidates, anchors).slice(0, MAX_CANDIDATES_PER_SLOT);
  }

  return { mandatoryItems, candidatesBySlot: ranked, error: null, weatherRules };
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
