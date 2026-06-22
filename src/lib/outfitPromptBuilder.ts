import type { ClothingItem } from "@/types/wardrobe";
import type { SlotResult, WeatherData } from "@/lib/outfitSlotEngine";
import { COLOUR_STORY_SURPRISE } from "@/lib/outfitConstants";
import { getOccasionProfile, TIER_LABELS } from "@/lib/occasionTaxonomy";

const TOKEN_BUDGET = 800;
// Rough approximation: 4 chars ≈ 1 token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function weatherSummary(weather: WeatherData | null, rules: SlotResult['weatherRules']): string {
  if (!weather) return 'Weather unknown — using mild defaults (20°C, clear).';
  const { temp, description } = weather;
  const { needsJumper, needsOuterwear, needsPuffer, isRaining, noOuterwear } = rules;
  const parts: string[] = [`${temp}°C, ${description}.`];
  if (noOuterwear) parts.push('Warm — no outerwear needed.');
  if (needsJumper && !needsPuffer) parts.push('Mild — a jumper layer is recommended.');
  if (needsPuffer) parts.push('Cold — a jumper and puffer/coat are required.');
  if (isRaining && !needsPuffer) parts.push('Raining — waterproof outerwear required.');
  if (isRaining && needsPuffer) parts.push('Cold and wet — puffer + waterproof outerwear ideal.');
  return parts.join(' ');
}

/** Format a single item compactly for the prompt. */
function formatItem(item: ClothingItem): string {
  const name = item.name.slice(0, 50);
  const color = (item.color || 'unknown').slice(0, 25);
  const fabric = (item.fabric || '').slice(0, 20);
  const extra = fabric ? `, ${fabric}` : '';
  return `[${item.id}] ${name} (${color}${extra})`;
}

/** Returns a worn marker string based on how many recent outfits contained this item. */
function wornMarker(count: number): string {
  if (count >= 2) return ' [🚫 worn multiple times — avoid]';
  if (count === 1) return ' [⚠️ worn recently — prefer alternatives]';
  return '';
}

/** Format mandatory (pre-selected) items for display in the prompt. */
function formatMandatorySection(mandatoryItems: ClothingItem[]): string {
  if (mandatoryItems.length === 0) return '';
  const lines = mandatoryItems.map(i => `  ${i.category}: ${formatItem(i)} ← ALREADY CHOSEN`);
  return `PRE-SELECTED (do not change these):\n${lines.join('\n')}\n\n`;
}

/** Format candidate items for a slot with optional recency markers. */
function formatSlotCandidates(
  slot: string,
  candidates: ClothingItem[],
  recentIdCounts: Map<string, number>,
): string {
  const label = slot.toUpperCase();
  const lines = candidates.map(c => `  ${formatItem(c)}${wornMarker(recentIdCounts.get(c.id) || 0)}`);
  return `${label} (pick 1):\n${lines.join('\n')}`;
}

/** Builds the MANDATORY ANCHOR block placed at the top of the AI prompt. */
function buildMandatoryAnchorBlock(anchor: ClothingItem): string {
  const fabric = (anchor.fabric || '').trim();
  const detail = fabric ? `, ${fabric}` : '';
  return [
    '══════════════════════════════════════════',
    'MANDATORY ANCHOR — HARD SYSTEM CONSTRAINT',
    '══════════════════════════════════════════',
    `✓ REQUIRED: ${anchor.name} (${anchor.color}${detail}) — this MUST be the top/primary layer for this outfit.`,
    'Build the bottom, shoes, outerwear, hat, and accessories around this item.',
    'Do NOT substitute any other top, shirt, jumper, or primary garment. That decision is already made.',
  ].join('\n');
}

/**
 * Builds a hat rotation instruction when a hat was worn in either of the last 2 outfits.
 * Uses specific item names so the AI knows exactly which hat to avoid and which to pick.
 */
function buildHatAvoidanceNote(
  hatCandidates: ClothingItem[],
  recentOutfitItemIds: string[][],
): string | null {
  if (!hatCandidates || hatCandidates.length === 0) return null;
  if (!recentOutfitItemIds || recentOutfitItemIds.length === 0) return null;
  const last2Sets = recentOutfitItemIds.slice(0, 2).map(ids => new Set(ids));
  const recentHats = hatCandidates.filter(h => last2Sets.some(s => s.has(h.id)));
  if (recentHats.length === 0) return null;
  const alternatives = hatCandidates.filter(h => !recentHats.some(rh => rh.id === h.id));
  const recentNames = recentHats.map(h => h.name.slice(0, 40)).join(', ');
  if (alternatives.length === 0) {
    return `HAT NOTE: ${recentNames} was worn recently but is the only hat available — may be reused if it suits the occasion.`;
  }
  const altNames = alternatives.map(h => h.name.slice(0, 40)).join(' or ');
  return `HAT ROTATION RULE: ${recentNames} was worn in the last 2 outfits. If including a hat, you MUST select ${altNames} instead. Do NOT use ${recentNames}.`;
}

/**
 * Builds the weather directive with occasion-appropriate weighting.
 *
 * weatherWeight from the occasion profile determines framing:
 *   ≤ 0.35 → occasion dress code dominates; weather is advisory
 *   0.36–0.69 → balanced; standard directive with no framing
 *   ≥ 0.70 → weather is primary; adapt layering freely
 */
function buildWeatherDirective(
  weather: WeatherData | null,
  weatherRules: SlotResult['weatherRules'],
  weatherWeight: number,
  tierLabel: string,
): string {
  const summary = weatherSummary(weather, weatherRules);
  if (weatherWeight <= 0.35) {
    return `WEATHER (advisory — ${tierLabel} dress code takes precedence): ${summary} Adapt layering where possible but maintain ${tierLabel.toLowerCase()} standards.`;
  }
  if (weatherWeight >= 0.7) {
    return `WEATHER (primary factor — adapt layering freely): ${summary}`;
  }
  return `WEATHER: ${summary}`;
}

/**
 * Build a focused AI prompt from a slot result.
 * Output is guaranteed to be under TOKEN_BUDGET tokens by progressively trimming
 * candidate lists if the draft exceeds the budget.
 *
 * Returns the full prompt string to send as the user message to the AI.
 */
export function buildAIPrompt(
  slotResult: SlotResult,
  occasion: string,
  weather: WeatherData | null,
  userStyle?: string,
  colourStory?: string,
  recentOutfitItemIds?: string[][],
  mandatoryAnchor?: ClothingItem,
): string {
  const { mandatoryItems, candidatesBySlot, weatherRules } = slotResult;

  // Build recency counts for ⚠️/🚫 worn markers on individual items.
  // These markers serve as a backstop for slots where fewer than 3 fresh alternatives
  // existed and recently-worn items could not be filtered out entirely.
  const recentIdCounts = new Map<string, number>();
  if (recentOutfitItemIds) {
    recentOutfitItemIds.slice(0, 5).forEach(idSet => {
      if (!idSet || idSet.length === 0) return;
      new Set(idSet).forEach(id => {
        recentIdCounts.set(id, (recentIdCounts.get(id) || 0) + 1);
      });
    });
  }

  const profile = getOccasionProfile(occasion);
  const tierLabel = TIER_LABELS[profile.tier];
  const hatAvoidanceNote = buildHatAvoidanceNote(candidatesBySlot['hat'] ?? [], recentOutfitItemIds ?? []);

  const header = [
    mandatoryAnchor ? buildMandatoryAnchorBlock(mandatoryAnchor) : null,
    `OCCASION (HARD CONSTRAINT — ${tierLabel}): "${occasion}" — every item MUST be appropriate for this occasion. Pieces that do not suit ${occasion} must not be selected regardless of colour or style.`,
    `OCCASION RULES: ${profile.aiGuidance}`,
    buildWeatherDirective(weather, weatherRules, profile.weatherWeight, tierLabel),
    userStyle ? `USER STYLE (secondary context — occasion and weather take priority): ${userStyle}` : null,
    hatAvoidanceNote,
    colourStory && colourStory !== COLOUR_STORY_SURPRISE
      ? `COLOUR PALETTE REQUESTED: ${colourStory.replace(/-/g, ' ')}. Rank candidates accordingly — pick items that best fulfil this palette.`
      : slotResult.colourStrategy
      ? `COLOUR APPROACH: The candidates are pre-ranked for a ${slotResult.colourStrategy}. Pick the top-ranked item in each slot unless a worn marker (⚠️/🚫) forces a substitution — the ranking was done so the #1 items form a coherent colour story together. Name the final colour story in stylingNote.`
      : 'COLOUR PALETTE: Your choice — pick the approach (tonal, neutral anchor, complementary, monochromatic) that best suits the occasion and name it in stylingNote.',
  ].filter(Boolean).join('\n');

  const rules = [
    '## SLOT RULES',
    '- Top (shirt) is ALWAYS required. A jumper LAYERS over the shirt — it does NOT replace it.',
    '- Bottoms are ALWAYS required.',
    '- LAYERING RULE: Outerwear (puffer, jacket, coat) and a jumper/hoodie are mutually exclusive — include one or the other, never both. You must never select 2 jumpers, 2 hoodies, or 2 outerwear items.',
    '- OUTERWEAR RULE: Outerwear is optional. Only include it if weather (cold, rain, wind), occasion (outdoor event, formal winter setting), or style context genuinely warrants it. If you include outerwear, select EXACTLY ONE item — one jacket, coat, or similar. You must never include two or more outerwear items in a single outfit under any circumstances.',
    weatherRules.needsJumper || (!weatherRules.noOuterwear && !weatherRules.needsPuffer)
      ? '- Jumper slot: include if available and relevant.'
      : null,
    weatherRules.needsPuffer ? '- Cold weather: jumper + puffer/coat both required if available.' : null,
    weatherRules.isRaining ? '- Rain: always include waterproof outerwear.' : null,
    weatherRules.noOuterwear ? '- Warm weather: no outerwear unless the occasion requires it.' : null,
    recentIdCounts.size > 0
      ? '- Items marked ⚠️ or 🚫 have been worn recently. Rotate across ALL slots equally — prefer fresh tops, bottoms, shoes, and accessories. No single slot gets priority over another.'
      : null,
  ].filter(Boolean).join('\n');

  const mandatory = formatMandatorySection(mandatoryItems);

  const slots = Object.keys(candidatesBySlot);

  // LOW: the "slot" value returned by the AI in guided mode is not used. The edge function maps
  // items by itemId only; the slot field is discarded and each item's category drives normalization.
  // The schema description is accurate for the AI's benefit but misleading to a code reader.
  const schema = `Respond ONLY with this JSON (no prose outside it):
{
  "selectedItems": [
    { "itemId": "<id from brackets above>", "slot": "top|bottom|jumper|outerwear|shoes|hat|accessory" }
  ],
  "outfitName": "2-4 word outfit name",
  "stylingNote": "1-2 sentences: explain the colour story and why this works for the occasion.",
  "proTip": "1 sentence: actionable styling tip the user can apply when wearing this."
}`;

  // Build candidate sections, then trim if over budget
  let candidateSections: string[] = slots.map(slot =>
    formatSlotCandidates(slot, candidatesBySlot[slot] || [], recentIdCounts)
  );

  const assemble = (sections: string[]) =>
    [header, '', rules, '', mandatory + 'WARDROBE CANDIDATES:', sections.join('\n\n'), '', schema].join('\n');

  let draft = assemble(candidateSections);

  // If over budget, progressively reduce candidates per slot to 3, then 2
  if (estimateTokens(draft) > TOKEN_BUDGET) {
    candidateSections = slots.map(slot =>
      formatSlotCandidates(slot, (candidatesBySlot[slot] || []).slice(0, 3), recentIdCounts)
    );
    draft = assemble(candidateSections);
  }
  if (estimateTokens(draft) > TOKEN_BUDGET) {
    candidateSections = slots.map(slot =>
      formatSlotCandidates(slot, (candidatesBySlot[slot] || []).slice(0, 2), recentIdCounts)
    );
    draft = assemble(candidateSections);
  }

  return draft;
}

/** Exposed for unit tests. */
export { estimateTokens };
