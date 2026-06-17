import type { ClothingItem } from "@/types/wardrobe";
import type { SlotResult, WeatherData } from "@/lib/outfitSlotEngine";
import { COLOUR_STORY_SURPRISE } from "@/lib/outfitConstants";

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

/** Maps a clothing category to the slot key used in candidatesBySlot. */
function categoryToSlotKey(cat: string): string {
  const normalized = (cat || '').toLowerCase();
  const MAP: Record<string, string> = {
    tops: 'top', dresses: 'top', bottoms: 'bottom',
    jumpers: 'jumper', hats: 'hat', accessories: 'accessory',
  };
  return MAP[normalized] ?? normalized;
}

const SLOT_ORDER = ['top', 'jumper', 'outerwear', 'bottom', 'shoes', 'hat', 'accessory'];

/**
 * Builds the per-slot rotation instruction block injected into the AI prompt.
 * Maps recently-worn item IDs to the slots they belong to (using the current
 * candidate pool as the source of truth for name + slot), then produces a
 * concise hard rule that tells the AI exactly which item names to avoid per slot.
 */
function buildSlotRotationSection(
  mandatoryItems: ClothingItem[],
  candidatesBySlot: Record<string, ClothingItem[]>,
  recentOutfitItemIds: string[][],
): string | null {
  if (!recentOutfitItemIds || recentOutfitItemIds.length === 0) return null;

  // Build id → { name, slot } from every item the AI can see
  const idInfo = new Map<string, { name: string; slot: string }>();
  for (const [slot, candidates] of Object.entries(candidatesBySlot)) {
    for (const item of candidates) {
      idInfo.set(item.id, { name: item.name.slice(0, 40), slot });
    }
  }
  for (const item of mandatoryItems) {
    idInfo.set(item.id, { name: item.name.slice(0, 40), slot: categoryToSlotKey(item.category) });
  }

  // Collect all recently-worn IDs, group by slot
  const recentIds = new Set(recentOutfitItemIds.flat());
  const avoidBySlot = new Map<string, string[]>();
  for (const id of recentIds) {
    const info = idInfo.get(id);
    if (!info) continue; // item not in current candidate pool — irrelevant
    const arr = avoidBySlot.get(info.slot) ?? [];
    if (!arr.includes(info.name)) arr.push(info.name);
    avoidBySlot.set(info.slot, arr);
  }

  if (avoidBySlot.size === 0) return null;

  const lines = SLOT_ORDER
    .filter(slot => avoidBySlot.has(slot))
    .map(slot => {
      const names = avoidBySlot.get(slot)!;
      const totalCandidates = (candidatesBySlot[slot] ?? []).length;
      const hasAlternative = totalCandidates > names.length;
      const label = slot.charAt(0).toUpperCase() + slot.slice(1);
      const suffix = hasAlternative ? '' : ' (only option — may reuse)';
      return `- ${label}: avoid ${names.join(', ')}${suffix}`;
    });

  if (lines.length === 0) return null;

  return [
    'WARDROBE ROTATION (HARD RULE): These items appeared in recent outfits. You MUST pick a different item for every slot where an alternative exists in the candidate list below.',
    ...lines,
  ].join('\n');
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

const FORMAL_RE = /\b(wedding|gala|black[-\s]?tie|formal|cocktail|funeral|opera)\b/i;
const BUSINESS_RE = /\b(business|interview|meeting|office|work|corporate|conference|presentation)\b/i;
const BEACH_RE = /\b(beach|pool|swim|holiday|vacation|tropical|summer)\b/i;
const NIGHT_OUT_RE = /\b(night out|party|club|bar|drinks|going out)\b/i;
const DATE_RE = /\b(date|dinner|romantic|brunch)\b/i;

/** Returns a short occasion-specific constraint note, or null for casual. */
function buildOccasionNote(occasion: string): string | null {
  if (FORMAL_RE.test(occasion)) {
    return 'OCCASION RULES: No gym wear, activewear, tracksuits, or sports-branded trainers. Clean smart shoes or sneakers are acceptable. Shirts, tailored trousers, blazers, and dresses are strongly preferred.';
  }
  if (BUSINESS_RE.test(occasion)) {
    return 'OCCASION RULES: No gym wear, activewear, or sports-branded athletic shoes. Collared shirts, smart trousers or clean jeans, and leather/smart shoes are preferred.';
  }
  if (BEACH_RE.test(occasion)) {
    return 'OCCASION RULES: No heavy winter coats or strict formal shoes (oxfords, brogues). Light fabrics, shorts, sandals, and canvas shoes are preferred.';
  }
  if (NIGHT_OUT_RE.test(occasion) || DATE_RE.test(occasion)) {
    return 'OCCASION RULES: No gym-specific activewear (compression tops, performance leggings, dry-fit shirts). Stylish casual or smart-casual items preferred.';
  }
  return null;
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

  // Build recency counts (how many of the last 5 outfits each item appeared in).
  const recentIdCounts = new Map<string, number>();
  const avoidanceLines: string[] = [];
  if (recentOutfitItemIds) {
    recentOutfitItemIds.slice(0, 5).forEach((idSet, i) => {
      if (!idSet || idSet.length === 0) return;
      avoidanceLines.push(`- Outfit ${i + 1}: [${idSet.join(', ')}]`);
      new Set(idSet).forEach(id => {
        recentIdCounts.set(id, (recentIdCounts.get(id) || 0) + 1);
      });
    });
  }

  const occasionNote = buildOccasionNote(occasion);
  const slotRotationSection = buildSlotRotationSection(mandatoryItems, candidatesBySlot, recentOutfitItemIds ?? []);
  const hatAvoidanceNote = buildHatAvoidanceNote(candidatesBySlot['hat'] ?? [], recentOutfitItemIds ?? []);

  const header = [
    mandatoryAnchor ? buildMandatoryAnchorBlock(mandatoryAnchor) : null,
    `OCCASION (HARD CONSTRAINT): "${occasion}" — every item MUST be appropriate for this occasion. Pieces that do not suit ${occasion} must not be selected regardless of colour or style.`,
    occasionNote,
    `WEATHER: ${weatherSummary(weather, weatherRules)}`,
    userStyle ? `USER STYLE (secondary context — occasion and weather take priority): ${userStyle}` : null,
    slotRotationSection,
    hatAvoidanceNote,
    colourStory && colourStory !== COLOUR_STORY_SURPRISE
      ? `COLOUR PALETTE REQUESTED: ${colourStory.replace(/-/g, ' ')}. Rank candidates accordingly — pick items that best fulfil this palette.`
      : slotResult.colourStrategy
      ? `COLOUR APPROACH: The candidates are pre-ranked for a ${slotResult.colourStrategy}. Pick the top-ranked item in each slot unless a worn marker (⚠️/🚫) forces a substitution — the ranking was done so the #1 items form a coherent colour story together. Name the final colour story in stylingNote.`
      : 'COLOUR PALETTE: Your choice — pick the approach (tonal, neutral anchor, complementary, monochromatic) that best suits the occasion and name it in stylingNote.',
    avoidanceLines.length > 0
      ? `\nRECENT OUTFITS (do NOT recreate any of these item combinations):\n${avoidanceLines.join('\n')}`
      : null,
  ].filter(Boolean).join('\n');

  const rules = [
    '## SLOT RULES',
    '- Top (shirt) is ALWAYS required. A jumper LAYERS over the shirt — it does NOT replace it.',
    '- Bottoms are ALWAYS required.',
    '- LAYERING RULE: A maximum of 1 jumper or hoodie per outfit. You may include 1 jumper alongside outerwear (puffer, jacket, coat) but you must never select 2 jumpers or 2 hoodies. Outerwear does not count toward this limit.',
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
