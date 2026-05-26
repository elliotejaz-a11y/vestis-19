import type { ClothingItem } from "@/types/wardrobe";
import type { SlotResult, WeatherData } from "@/lib/outfitSlotEngine";

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

  const header = [
    `OCCASION: "${occasion}"`,
    `WEATHER: ${weatherSummary(weather, weatherRules)}`,
    userStyle ? `USER STYLE (secondary context — occasion and weather take priority): ${userStyle}` : null,
    colourStory && colourStory !== 'surprise'
      ? `COLOUR PALETTE REQUESTED: ${colourStory.replace(/-/g, ' ')}. Rank candidates accordingly — pick items that best fulfil this palette.`
      : slotResult.colourStrategy
      ? `COLOUR APPROACH: The candidates are pre-ranked for a ${slotResult.colourStrategy}. Pick the top-ranked item in each slot unless a worn marker (⚠️/🚫) forces a substitution — the ranking was done so the #1 items form a coherent colour story together. Name the final colour story in stylingNote.`
      : 'COLOUR PALETTE: Your choice — pick the approach (tonal, neutral anchor, complementary, monochromatic) that best suits the occasion and name it in stylingNote.',
    avoidanceLines.length > 0
      ? `\nRECENT OUTFITS — do NOT recreate any of these item combinations:\n${avoidanceLines.join('\n')}`
      : null,
  ].filter(Boolean).join('\n');

  const rules = [
    '## SLOT RULES',
    '- Top (shirt) is ALWAYS required. A jumper LAYERS over the shirt — it does NOT replace it.',
    '- Bottoms are ALWAYS required.',
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
