/**
 * styleThisItemPrompt — builds the AI user-message prompt for "Style This Item" generation.
 *
 * How each input shapes the output:
 *  - anchorItem:       Listed first as MANDATORY. The AI is told it cannot be omitted or substituted.
 *  - occasion:         Translates to a human label + behavioural guidance for the stylist.
 *  - styleDirection:   Translates to a colour/silhouette brief the stylist must honour.
 *  - weather:          Translates to specific layering and fabric instructions.
 *  - wardrobeItems:    All remaining wardrobe items, grouped by category slot for the AI to pick from.
 *  - recentItemIds:    Item IDs from the last 5 generated outfits — AI is asked to prefer fresh items.
 *
 * The output is sent as `preBuiltPrompt` to the existing generate-outfit edge function (guided mode),
 * where the AI calls the `create_outfit` tool to return structured JSON.
 */

import type { StyleThisItemRequest, StyleOccasion, StyleDirection } from '@/types/wardrobe';
import type { ClothingItem } from '@/types/wardrobe';

// ── Occasion label + behavioural guidance ────────────────────────────────────

const OCCASION_LABELS: Record<StyleOccasion, string> = {
  everyday_casual: 'Everyday Casual',
  work_office: 'Work / Office',
  date_night: 'Date Night',
  formal_event: 'Formal Event',
  outdoor_active: 'Outdoor / Active',
  weekend_brunch: 'Weekend Brunch',
  night_out: 'Night Out',
  travel: 'Travel',
};

const OCCASION_GUIDANCE: Record<StyleOccasion, string> = {
  everyday_casual: 'Relaxed daily wear — comfort-forward but put together. Clean, unfussy combinations.',
  work_office: 'Professional and polished. Smart but not overly formal. No athletic wear or overly casual pieces.',
  date_night: 'Elevated and intentional. Confident — could be restaurant or cocktail bar. Smart casual to smart.',
  formal_event: 'Dress code adherent. Refined and occasion-appropriate. No gym wear, trainers, or overly casual items.',
  outdoor_active: 'Functional and weather-appropriate. Performance or active items are welcome. Practical first.',
  weekend_brunch: 'Effortless and stylish. Social but relaxed. Looks good without trying too hard.',
  night_out: 'Bold and evening-appropriate. Club or bar setting. Statement pieces welcome.',
  travel: 'Comfortable, layerable, and practical. Wrinkle-tolerant fabrics preferred. Versatile combinations.',
};

// ── Style direction brief ─────────────────────────────────────────────────────

const DIRECTION_LABELS: Record<StyleDirection, string> = {
  minimal_clean: 'Minimal / Clean',
  streetwear_edge: 'Streetwear / Edge',
  smart_casual: 'Smart Casual',
  classic_tailored: 'Classic / Tailored',
  relaxed_luxe: 'Relaxed Luxe',
  bold_expressive: 'Bold / Expressive',
};

const DIRECTION_GUIDANCE: Record<StyleDirection, string> = {
  minimal_clean: 'Max 3 colours, clean silhouettes, no busy patterns. Restrained and intentional.',
  streetwear_edge: 'Urban influence, relaxed fits. Mix high and low. Brand-conscious where appropriate.',
  smart_casual: 'Elevated basics, neat presentation. No tie required but a jacket is acceptable.',
  classic_tailored: 'Structured pieces, traditional colour combinations. Timeless over trendy.',
  relaxed_luxe: 'Premium fabrics and finishes in casual silhouettes. Elevated leisure — looks expensive and easy.',
  bold_expressive: 'Interesting colour combinations, pattern mixing allowed. Statement pieces encouraged.',
};

// ── Weather layering guidance ─────────────────────────────────────────────────

function weatherGuidance(condition: StyleThisItemRequest['weather']['condition'], temp: number): string {
  if (condition === 'cold' || temp < 8) {
    return `Cold (${temp}°C) — include outerwear. Prioritise warmth and layering. Avoid shorts or sleeveless tops.`;
  }
  if (condition === 'hot' || temp > 26) {
    return `Hot (${temp}°C) — no outerwear unless the occasion demands it. Light fabrics. Shorts are fine if available.`;
  }
  if (condition === 'rainy') {
    return `Rainy (${temp}°C) — include a waterproof or water-resistant outer layer if one is available in the wardrobe.`;
  }
  if (condition === 'windy') {
    return `Windy (${temp}°C) — consider a structured jacket or coat for coverage.`;
  }
  if (condition === 'sunny') {
    return `Sunny (${temp}°C) — light to mid-weight fabrics. No heavy outerwear needed.`;
  }
  // cloudy
  return `Overcast (${temp}°C) — mild layering is fine. A light jacket is optional.`;
}

// ── Item formatting ───────────────────────────────────────────────────────────

function formatItem(item: ClothingItem, recentSet: Set<string>): string {
  const name = item.name.slice(0, 50);
  const color = (item.color || 'unknown').slice(0, 25);
  const fabric = (item.fabric || '').slice(0, 20);
  const extra = fabric ? `, ${fabric}` : '';
  const marker = recentSet.has(item.id) ? ' [worn recently — prefer alternatives]' : '';
  return `[${item.id}] ${name} (${color}${extra})${marker}`;
}

function formatSlot(
  label: string,
  items: ClothingItem[],
  recentSet: Set<string>,
  required: boolean,
): string {
  if (items.length === 0) return '';
  const qualifier = required ? 'pick 1 — required' : 'optional';
  const lines = items.map((i) => `  ${formatItem(i, recentSet)}`).join('\n');
  return `${label} (${qualifier}):\n${lines}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildStyleThisItemPrompt(
  request: StyleThisItemRequest,
  recentOutfitItemIds: string[][],
): string {
  const { anchorItem, occasion, styleDirection, weather, wardrobeItems } = request;

  // Build the set of recently-used item IDs (flattened across last 5 outfits)
  const recentSet = new Set(recentOutfitItemIds.flat());

  // Categorise wardrobe items (excluding anchor — it's shown separately as mandatory)
  const others = wardrobeItems.filter((i) => i.id !== anchorItem.id);
  const cat = (item: ClothingItem) => (item.category || '').toLowerCase();

  const tops = others.filter((i) => cat(i) === 'tops' || cat(i) === 'dresses');
  const bottoms = others.filter((i) => cat(i) === 'bottoms');
  const jumpers = others.filter((i) => cat(i) === 'jumpers');
  const outerwear = others.filter((i) => cat(i) === 'outerwear');
  const shoes = others.filter((i) => cat(i) === 'shoes');
  const hats = others.filter((i) => cat(i) === 'hats');
  const accessories = others.filter((i) => cat(i) === 'accessories');

  const anchorCat = cat(anchorItem);
  const anchorIsTop = anchorCat === 'tops' || anchorCat === 'dresses' || anchorCat === 'jumpers';
  const anchorIsBottom = anchorCat === 'bottoms';
  const anchorIsOuterwear = anchorCat === 'outerwear';
  const anchorIsShoes = anchorCat === 'shoes';

  const weatherInfo = weatherGuidance(weather.condition, weather.temperatureCelsius);
  const feelsNote = weather.feelsLikeCelsius !== undefined
    ? ` (feels like ${weather.feelsLikeCelsius}°C)`
    : '';

  // Build the anchor block
  const anchorFabric = (anchorItem.fabric || '').trim();
  const anchorDetail = anchorFabric ? `, ${anchorFabric}` : '';
  const anchorTags = anchorItem.tags?.length ? ` | tags: ${anchorItem.tags.slice(0, 5).join(', ')}` : '';
  const anchorBlock = [
    '══════════════════════════════════════',
    'ANCHOR ITEM — MANDATORY',
    '══════════════════════════════════════',
    `[${anchorItem.id}] ${anchorItem.name} (${anchorItem.color}${anchorDetail})`,
    `Category: ${anchorItem.category}${anchorTags}`,
    'This item MUST appear in selectedItems. Do not substitute or omit it.',
    'Build the rest of the outfit to complement this piece.',
  ].join('\n');

  // Build context block
  const contextBlock = [
    `OCCASION: ${OCCASION_LABELS[occasion]}`,
    OCCASION_GUIDANCE[occasion],
    '',
    `STYLE DIRECTION: ${DIRECTION_LABELS[styleDirection]}`,
    DIRECTION_GUIDANCE[styleDirection],
    '',
    `WEATHER: ${weather.temperatureCelsius}°C${feelsNote}, ${weather.condition}`,
    weatherInfo,
  ].join('\n');

  // Build wardrobe candidate sections — only include slots not occupied by anchor
  const slotSections: string[] = [];

  if (!anchorIsTop && tops.length > 0) {
    slotSections.push(formatSlot('TOP', tops.slice(0, 5), recentSet, true));
  }
  if (!anchorIsBottom && bottoms.length > 0) {
    slotSections.push(formatSlot('BOTTOM', bottoms.slice(0, 5), recentSet, true));
  }
  if (!anchorIsOuterwear && outerwear.length > 0) {
    slotSections.push(formatSlot('OUTERWEAR', outerwear.slice(0, 4), recentSet, false));
  }
  if (!anchorIsTop && jumpers.length > 0) {
    // Jumpers are optional and mutually exclusive with outerwear
    slotSections.push(formatSlot('JUMPER (optional — not if outerwear selected)', jumpers.slice(0, 3), recentSet, false));
  }
  if (!anchorIsShoes && shoes.length > 0) {
    slotSections.push(formatSlot('SHOES', shoes.slice(0, 5), recentSet, true));
  }
  if (hats.length > 0) {
    slotSections.push(formatSlot('HAT', hats.slice(0, 3), recentSet, false));
  }
  if (accessories.length > 0) {
    slotSections.push(formatSlot('ACCESSORIES', accessories.slice(0, 4), recentSet, false));
  }

  const wardrobeBlock = slotSections.length > 0
    ? `WARDROBE CANDIDATES (select supporting items):\n${slotSections.join('\n\n')}`
    : 'WARDROBE CANDIDATES: No other items available — build the outfit around the anchor alone.';

  // Recency note
  const recentNote = recentSet.size > 0
    ? `RECENTLY USED ITEMS — prefer items NOT marked [worn recently]:\n${[...recentSet].slice(0, 20).join(', ')}`
    : '';

  const sections = [anchorBlock, '', contextBlock, '', wardrobeBlock];
  if (recentNote) sections.push('', recentNote);

  return sections.join('\n');
}
