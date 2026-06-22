/**
 * Occasion taxonomy — single source of truth for occasion intelligence.
 *
 * Replaces scattered regex patterns across outfitSlotEngine, outfitPromptBuilder,
 * and the edge function with a unified set of OccasionProfile objects.
 *
 * Usage:
 *   import { classifyOccasion, getOccasionProfile } from '@/lib/occasionTaxonomy';
 *   const profile = getOccasionProfile('Business dinner');
 *   // profile.tier === 'smart_casual', profile.weatherWeight === 0.6, etc.
 */

import type { ClothingCategory } from '@/types/wardrobe';

export type OccasionCategory =
  | 'casual_day_out'
  | 'business_meeting'
  | 'date_night'
  | 'wedding_guest'
  | 'beach_vacation'
  | 'gym_workout'
  | 'weekend_brunch'
  | 'job_interview'
  | 'night_out_party'
  | 'formal_event'
  | 'travel';

export type OccasionTier = 'formal' | 'business' | 'smart_casual' | 'casual' | 'active' | 'beach';

export interface OccasionProfile {
  category: OccasionCategory;
  /** Human-readable label shown in the UI and passed to the AI. */
  label: string;
  /** Broad dress-code tier. */
  tier: OccasionTier;
  /** 1 = gym/beach, 2 = casual, 3 = smart-casual, 4 = business/formal, 5 = black-tie */
  formalityLevel: 1 | 2 | 3 | 4 | 5;
  /** Categories that MUST NOT appear in the final outfit (used by validator). */
  forbiddenCategories: ClothingCategory[];
  /** Item-level exclusion patterns — items whose searchable text matches are excluded from candidates. */
  forbiddenPatterns: RegExp[];
  /**
   * Weather influence weight: 0 = occasion always overrides weather, 1 = weather always overrides occasion.
   * Used by prompt builder to label weather as advisory vs primary.
   */
  weatherWeight: number;
  /** Whether hats/headwear are appropriate for this occasion. */
  allowHats: boolean;
  /** AI guidance text injected into the occasion constraint block of the prompt. */
  aiGuidance: string;
  /** Regex patterns used to classify free-text occasion strings into this category. */
  matchPatterns: RegExp[];
}

// ── Shared item-level exclusion patterns (no /g or /y — safe for repeated .test()) ─────

const GYM_WEAR = /\b(compression|activewear|athletic wear|performance top|training top|workout top|gym top|sports top|spandex|elastane|dry[\s-]?fit|moisture[\s-]?wicking)\b/i;
const BRANDED_ATHLETIC_SHOES = /\b(TN|TNs|air ?max|air ?force|running shoe|trail shoe|training shoe|gym shoe|sports shoe|basketball shoe|tech runner|boost|ultra ?boost|foam ?runner)\b/i;
const TRACKSUIT = /\b(tracksuit|track ?pants?|sweatpants?)\b/i;
const HEAVY_COAT = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|down jacket|peacoat|overcoat|trench coat|duffel coat|wool coat|toggle coat|shearling)\b/i;
const FORMAL_SHOES = /\b(oxford|derby|derbies|brogue|court shoe|kitten heel|stiletto)\b/i;
const GRAPHIC_TEE = /\b(graphic|printed tee|slogan tee|logo tee|band tee|tour tee|statement tee)\b/i;

// ── Occasion profiles ──────────────────────────────────────────────────────────────────

export const OCCASION_PROFILES: Record<OccasionCategory, OccasionProfile> = {

  casual_day_out: {
    category: 'casual_day_out',
    label: 'Casual Day Out',
    tier: 'casual',
    formalityLevel: 2,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR],
    weatherWeight: 0.9,
    allowHats: true,
    aiGuidance: 'Relaxed everyday wear. Clean and unfussy. Jeans, chinos, casual tops, trainers or casual shoes are all appropriate. Avoid gym-specific activewear.',
    matchPatterns: [/(casual|everyday|chilled|relaxed|day[\s-]?out|hanging|errands?|shopping|stroll|park)/i],
  },

  business_meeting: {
    category: 'business_meeting',
    label: 'Business Meeting',
    tier: 'business',
    formalityLevel: 4,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, BRANDED_ATHLETIC_SHOES, TRACKSUIT],
    weatherWeight: 0.35,
    allowHats: false,
    aiGuidance: 'Smart professional workwear. Collared shirts, smart trousers or clean dark jeans. Smart leather shoes, loafers, or clean minimal dress sneakers. No hoodies, graphic tees, athletic wear, hats, caps, or sports-branded footwear.',
    matchPatterns: [/\b(business|meeting|office|work|corporate|conference|presentation|professional|boardroom)\b/i],
  },

  date_night: {
    category: 'date_night',
    label: 'Date Night',
    tier: 'smart_casual',
    formalityLevel: 3,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, TRACKSUIT],
    weatherWeight: 0.65,
    allowHats: true,
    aiGuidance: 'Elevated and intentional. Confident and well-put-together — restaurant or cocktail bar standard. Smart casual minimum. Stylish casual or smart items. No gym wear or tracksuits.',
    matchPatterns: [/\b(date[\s-]?night|date|dinner[\s-]?date|romantic|anniversary|valentine)\b/i],
  },

  wedding_guest: {
    category: 'wedding_guest',
    label: 'Wedding Guest',
    tier: 'formal',
    formalityLevel: 4,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, BRANDED_ATHLETIC_SHOES, TRACKSUIT],
    weatherWeight: 0.3,
    allowHats: true,
    aiGuidance: 'Occasion-appropriate formal or smart-formal. Tailored suit, smart dress, or formal separates. Clean smart shoes mandatory — no trainers, sport-branded shoes, or athletic footwear. Fascinators and formal hats are welcome.',
    matchPatterns: [/\b(wedding|bride|groom|bridesmaid|registry[\s-]?office|hen[\s-]?night|stag[\s-]?do)\b/i],
  },

  beach_vacation: {
    category: 'beach_vacation',
    label: 'Beach / Vacation',
    tier: 'beach',
    formalityLevel: 1,
    forbiddenCategories: [],
    forbiddenPatterns: [HEAVY_COAT, FORMAL_SHOES],
    weatherWeight: 0.95,
    allowHats: true,
    aiGuidance: 'Light and breathable. Shorts, linen, t-shirts, sundresses. Sandals, canvas shoes, or trainers. No heavy coats, puffers, or formal dress shoes. Hats and sunglasses are strongly encouraged.',
    matchPatterns: [/\b(beach|pool|swim|holiday|vacation|tropical|resort|island|boat)\b/i],
  },

  gym_workout: {
    category: 'gym_workout',
    label: 'Gym / Workout',
    tier: 'active',
    formalityLevel: 1,
    forbiddenCategories: ['hats', 'accessories', 'outerwear'],
    forbiddenPatterns: [],
    weatherWeight: 0.1,
    allowHats: false,
    aiGuidance: 'Athletic performance wear only. Exactly 3 items: one gym top (t-shirt, compression, performance polyester), one athletic bottom (shorts, joggers, track pants), one closed trainer. No jackets, jewellery, bags, or formal items.',
    matchPatterns: [/\b(gym|workout|training|exercise|fitness|running|jogging|cardio|weights|lifting|pilates|yoga|sport)\b/i],
  },

  weekend_brunch: {
    category: 'weekend_brunch',
    label: 'Brunch with Friends',
    tier: 'smart_casual',
    formalityLevel: 2,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR],
    weatherWeight: 0.8,
    allowHats: true,
    aiGuidance: 'Effortless and stylish. Social but relaxed — looks good without trying too hard. Clean jeans or smart trousers, casual knit or shirt, clean trainers or loafers.',
    matchPatterns: [/\b(brunch|sunday[\s-]?lunch|brunch[\s-]?with|cafe|bistro|afternoon[\s-]?tea)\b/i],
  },

  job_interview: {
    category: 'job_interview',
    label: 'Job Interview',
    tier: 'business',
    formalityLevel: 4,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, BRANDED_ATHLETIC_SHOES, TRACKSUIT, GRAPHIC_TEE],
    weatherWeight: 0.25,
    allowHats: false,
    aiGuidance: 'Professional, polished, and interview-ready. Conservative smart casual or business attire. Collared shirt, smart trousers or clean dark jeans, smart shoes. No hoodies, graphic tees, athletic wear, hats, caps, or trainers.',
    matchPatterns: [/\b(interview|job[\s-]?interview|job[\s-]?application|assessment[\s-]?cent(re|er))\b/i],
  },

  night_out_party: {
    category: 'night_out_party',
    label: 'Night Out / Party',
    tier: 'smart_casual',
    formalityLevel: 3,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, TRACKSUIT],
    weatherWeight: 0.6,
    allowHats: true,
    aiGuidance: 'Bold and evening-appropriate. Club, bar, party, or dinner setting. Statement pieces welcome. Smart casual to smart. No gym-specific activewear or tracksuits.',
    matchPatterns: [/\b(night[\s-]?out|party|club|bar|drinks|going[\s-]?out|pub|festival|gig|concert|rave|nightclub|dinner)\b/i],
  },

  formal_event: {
    category: 'formal_event',
    label: 'Formal Event',
    tier: 'formal',
    formalityLevel: 5,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR, BRANDED_ATHLETIC_SHOES, TRACKSUIT, GRAPHIC_TEE],
    weatherWeight: 0.2,
    allowHats: true,
    aiGuidance: 'Dress code adherent and refined. Formal suit, tailored separates, or smart dress mandatory. Dress shoes or heels only. No trainers, graphic tees, hoodies, or athletic items of any kind.',
    matchPatterns: [/\b(formal|black[\s-]?tie|gala|cocktail|opera|ballet|graduation|ceremony|award)\b/i],
  },

  travel: {
    category: 'travel',
    label: 'Travel',
    tier: 'casual',
    formalityLevel: 2,
    forbiddenCategories: [],
    forbiddenPatterns: [GYM_WEAR],
    weatherWeight: 0.9,
    allowHats: true,
    aiGuidance: 'Comfortable, practical, and layerable. Wrinkle-tolerant fabrics preferred. Versatile combinations that work across multiple settings — ideal for airports, trains, and long journeys.',
    matchPatterns: [/\b(travel|trip|airport|flight|train|road[\s-]?trip|transit|expedition|backpack)\b/i],
  },
};

// ── Classification ─────────────────────────────────────────────────────────────────────

/**
 * Priority order for free-text classification.
 * More specific / higher-stakes occasions come first to avoid false matches.
 * (e.g. "wedding ceremony" → wedding_guest, not formal_event via "ceremony")
 */
const CLASSIFICATION_PRIORITY: OccasionCategory[] = [
  'gym_workout',
  'job_interview',
  'wedding_guest',
  'formal_event',
  'business_meeting',
  'beach_vacation',
  'night_out_party',
  'date_night',
  'weekend_brunch',
  'travel',
  'casual_day_out',
];

/**
 * Classifies any occasion string into an OccasionCategory.
 * Tries each profile's matchPatterns in priority order.
 * Defaults to 'casual_day_out' if no pattern matches.
 */
export function classifyOccasion(occasion: string): OccasionCategory {
  if (!occasion) return 'casual_day_out';
  for (const category of CLASSIFICATION_PRIORITY) {
    if (OCCASION_PROFILES[category].matchPatterns.some(p => p.test(occasion))) {
      return category;
    }
  }
  return 'casual_day_out';
}

/**
 * Returns the OccasionProfile for a given occasion string.
 */
export function getOccasionProfile(occasion: string): OccasionProfile {
  return OCCASION_PROFILES[classifyOccasion(occasion)];
}

/** Display labels for each tier — used in UI badges. */
export const TIER_LABELS: Record<OccasionTier, string> = {
  formal: 'Formal',
  business: 'Business',
  smart_casual: 'Smart Casual',
  casual: 'Casual',
  active: 'Active',
  beach: 'Beach',
};

/** Tailwind background colour classes for tier indicator dots in the UI. */
export const TIER_DOT_CLASSES: Record<OccasionTier, string> = {
  formal: 'bg-purple-500',
  business: 'bg-blue-500',
  smart_casual: 'bg-teal-500',
  casual: 'bg-green-500',
  active: 'bg-orange-500',
  beach: 'bg-yellow-400',
};
