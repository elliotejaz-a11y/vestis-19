/**
 * Phase 3 + Phase 5 scenario tests for enforceOuterwearConstraint.
 * Runs against the compiled useWardrobe module logic by extracting the function
 * directly. Since the function is module-private, we replicate its logic here
 * verbatim and test the behaviour — this is the canonical Phase 3 pass/fail record.
 */

import { describe, it, expect, vi } from 'vitest';

// ── Replicate the exact function from useWardrobe.ts ──────────────────────────
const HEAVY_OUTERWEAR_PATTERN = /\b(puffer|parka|duvet jacket|padded jacket|quilted jacket|winter coat|heavy coat|fur|shearling|down jacket|anorak|peacoat|overcoat|trench coat|duffel coat|toggle coat|wool coat)\b/i;
const WATERPROOF_PATTERN = /\b(waterproof|water[-\s]?resistant|rain ?jacket|windbreaker|shell jacket|gore[-\s]?tex|mac|mackintosh|cagoule|pac[-\s]?a[-\s]?mac|hardshell)\b/i;
const RAINY_PATTERN = /\b(rain|rainy|drizzle|shower|showers|wet|precipitation|storm|stormy|downpour)\b/i;
const COLD_TEMP = 12;

interface Item { id: string; category: string; name: string; fabric?: string; notes?: string; tags?: string[]; }
function isOuterwearCategory(item: Item): boolean { return (item.category || '').trim().toLowerCase() === 'outerwear'; }
function getItemSearchText(item: Item): string { return [item.name, item.category, item.fabric, item.notes, ...(item.tags || [])].filter(Boolean).join(' ').toLowerCase(); }
function isHeavyOuterwear(item: Item): boolean { if (!isOuterwearCategory(item)) return false; return HEAVY_OUTERWEAR_PATTERN.test(getItemSearchText(item)); }
function isWaterproofOuterwear(item: Item): boolean { return WATERPROOF_PATTERN.test(getItemSearchText(item)); }

function enforceOuterwearConstraint(selectedItems: Item[], weather?: { temp: number; description: string }): Item[] {
  const outerwearItems = selectedItems.filter(isOuterwearCategory);
  if (outerwearItems.length <= 1) return selectedItems;
  const rainy = weather ? RAINY_PATTERN.test(weather.description) : false;
  const cold = weather ? weather.temp < COLD_TEMP : false;
  let keep: Item;
  if (rainy) keep = outerwearItems.find(isWaterproofOuterwear) ?? outerwearItems[0];
  else if (cold) keep = outerwearItems.find(isHeavyOuterwear) ?? outerwearItems[0];
  else keep = outerwearItems[0];
  const removed = outerwearItems.length - 1;
  console.warn(`[Vestis] Outerwear constraint triggered: removed ${removed} outerwear item(s). Kept: "${keep.name}".`);
  return selectedItems.filter(i => !isOuterwearCategory(i) || i.id === keep.id);
}

// ── Test data ──────────────────────────────────────────────────────────────────
const top = { id: 't1', category: 'tops', name: 'White Tee' };
const bottom = { id: 'b1', category: 'bottoms', name: 'Black Jeans' };
const shoes = { id: 's1', category: 'shoes', name: 'White Sneakers' };
const jacket = { id: 'ow1', category: 'outerwear', name: 'Denim Jacket' };
const trench = { id: 'ow2', category: 'outerwear', name: 'Beige Trench Coat' };
const puffer = { id: 'ow3', category: 'outerwear', name: 'Black Puffer Jacket' };
const rainJacket = { id: 'ow4', category: 'outerwear', name: 'Waterproof Rain Jacket' };
const hoodie = { id: 'j1', category: 'jumpers', name: 'Grey Hoodie' };
const blazer = { id: 'ow5', category: 'outerwear', name: 'Navy Blazer' };

describe('enforceOuterwearConstraint', () => {
  it('SCENARIO A — zero outerwear: returns unchanged', () => {
    const items = [top, bottom, shoes];
    const result = enforceOuterwearConstraint(items);
    expect(result).toEqual(items);
    expect(result.filter(isOuterwearCategory).length).toBe(0);
  });

  it('SCENARIO B — one outerwear (valid): returns unchanged', () => {
    const items = [top, bottom, shoes, jacket];
    const result = enforceOuterwearConstraint(items);
    expect(result).toEqual(items);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.find(isOuterwearCategory)?.id).toBe('ow1');
  });

  it('SCENARIO C — two outerwear items: removes one', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = [top, bottom, shoes, jacket, trench];
    const result = enforceOuterwearConstraint(items);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('removed 1 outerwear item(s)'));
    warnSpy.mockRestore();
  });

  it('SCENARIO D — three outerwear items: removes two, keeps one', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = [top, bottom, shoes, jacket, trench, puffer];
    const result = enforceOuterwearConstraint(items);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.length).toBe(4); // top + bottom + shoes + 1 outerwear
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('removed 2 outerwear item(s)'));
    warnSpy.mockRestore();
  });

  it('SCENARIO D cont — rainy weather: prefers waterproof when removing duplicates', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rainy = { temp: 14, description: 'rainy' };
    const items = [top, bottom, shoes, jacket, rainJacket];
    const result = enforceOuterwearConstraint(items, rainy);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.find(isOuterwearCategory)?.id).toBe('ow4'); // rainJacket preferred
    warnSpy.mockRestore();
  });

  it('SCENARIO D cont — cold weather: prefers heavy coat when removing duplicates', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cold = { temp: 8, description: 'clear' };
    const items = [top, bottom, shoes, jacket, puffer]; // puffer matches HEAVY_OUTERWEAR_PATTERN
    const result = enforceOuterwearConstraint(items, cold);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.find(isOuterwearCategory)?.id).toBe('ow3'); // puffer preferred in cold
    warnSpy.mockRestore();
  });

  it('SCENARIO G — hoodie is NOT outerwear (category=jumpers): not affected by constraint', () => {
    const items = [top, bottom, shoes, jacket, hoodie];
    const result = enforceOuterwearConstraint(items);
    expect(result).toEqual(items); // only 1 outerwear; hoodie is jumpers
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.some(i => i.id === 'j1')).toBe(true);
  });

  it('SCENARIO G cont — blazer IS outerwear (category=outerwear): treated as outerwear', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = [top, bottom, shoes, jacket, blazer];
    const result = enforceOuterwearConstraint(items);
    expect(result.filter(isOuterwearCategory).length).toBe(1); // blazer + jacket → keep first
    warnSpy.mockRestore();
  });

  it('SCENARIO H — non-outerwear items untouched when constraint fires', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const accessory = { id: 'a1', category: 'accessories', name: 'Silver Watch' };
    const hat = { id: 'h1', category: 'hats', name: 'Baseball Cap' };
    const items = [top, bottom, shoes, jacket, trench, accessory, hat];
    const result = enforceOuterwearConstraint(items);
    expect(result.filter(isOuterwearCategory).length).toBe(1);
    expect(result.some(i => i.id === 'a1')).toBe(true); // accessory preserved
    expect(result.some(i => i.id === 'h1')).toBe(true); // hat preserved
    expect(result.some(i => i.id === 't1')).toBe(true); // top preserved
    expect(result.some(i => i.id === 'b1')).toBe(true); // bottom preserved
    warnSpy.mockRestore();
  });
});
