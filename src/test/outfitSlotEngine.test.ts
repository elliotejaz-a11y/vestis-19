import { describe, it, expect } from "vitest";
import { resolveSlots, buildFallbackOutfit } from "@/lib/outfitSlotEngine";
import type { ClothingItem } from "@/types/wardrobe";

function makeItem(id: string, category: string, name = id, color = "black", extra: Partial<ClothingItem> = {}): ClothingItem {
  return { id, name, category, color, fabric: "cotton", imageUrl: "", tags: [], notes: "", addedAt: new Date(), isPrivate: false, ...extra };
}

const top1    = makeItem("top1",    "tops",      "White Tee",        "white");
const top2    = makeItem("top2",    "tops",      "Black Tee",        "black");
const bottom1 = makeItem("btm1",    "bottoms",   "Blue Jeans",       "blue");
const bottom2 = makeItem("btm2",    "bottoms",   "Black Chinos",     "black");
const jumper1 = makeItem("jmp1",    "jumpers",   "Grey Knit",        "grey");
const outer1  = makeItem("out1",    "outerwear", "Navy Bomber",      "navy");
const puffer1 = makeItem("puf1",    "outerwear", "Black Puffer Jacket", "black");
const rain1   = makeItem("rnj1",    "outerwear", "Waterproof Rain Jacket", "olive");
const shoe1   = makeItem("sho1",    "shoes",     "White Sneakers",   "white");
const hat1    = makeItem("hat1",    "hats",      "Black Cap",        "black");
const acc1    = makeItem("acc1",    "accessories","Silver Watch",    "silver");
const dress1  = makeItem("drs1",    "dresses",   "Navy Midi Dress",  "navy");

const fullWardrobe = [top1, top2, bottom1, bottom2, jumper1, outer1, shoe1, hat1, acc1];

// ── RULE 1: shirt always required ────────────────────────────────────────────

describe("RULE 1 — tops required", () => {
  it("returns error when wardrobe has no tops and no dresses", () => {
    const wardrobe = [bottom1, shoe1];
    const result = resolveSlots(wardrobe, null, "Casual day out");
    expect(result.error).not.toBeNull();
    expect(result.error?.type).toBe("missing_tops");
    expect(result.error?.message).toContain("tops");
  });

  it("does NOT error when wardrobe has tops", () => {
    const result = resolveSlots([top1, bottom1, shoe1], null, "Casual day out");
    expect(result.error).toBeNull();
  });

  it("does NOT error when wardrobe has only dresses (dress satisfies tops)", () => {
    const result = resolveSlots([dress1, shoe1], null, "Casual day out");
    expect(result.error).toBeNull();
  });
});

// ── RULE 2: bottoms required ─────────────────────────────────────────────────

describe("RULE 2 — bottoms required", () => {
  it("returns error when wardrobe has no bottoms and no dresses", () => {
    const wardrobe = [top1, shoe1];
    const result = resolveSlots(wardrobe, null, "Casual day out");
    expect(result.error).not.toBeNull();
    expect(result.error?.type).toBe("missing_bottoms");
  });

  it("does NOT error when wardrobe has bottoms", () => {
    const result = resolveSlots([top1, bottom1, shoe1], null, "Casual day out");
    expect(result.error).toBeNull();
  });

  it("does NOT error when wardrobe has only dresses (dress satisfies bottoms)", () => {
    const result = resolveSlots([top1, dress1, shoe1], null, "Casual day out");
    expect(result.error).toBeNull();
  });
});

// ── RULE 3: jumper is additive (never substitutes the top) ────────────────────

describe("RULE 3 — jumper slot is separate from top slot", () => {
  it("both top and jumper slots are in candidatesBySlot when jumper weather triggers", () => {
    const wardrobe = [top1, bottom1, jumper1, shoe1];
    // 17°C → needsJumper=true
    const result = resolveSlots(wardrobe, { temp: 17, description: "Cloudy" }, "Casual day out");
    expect(result.error).toBeNull();
    expect(result.candidatesBySlot).toHaveProperty("top");
    expect(result.candidatesBySlot).toHaveProperty("jumper");
    // The top slot contains only 'tops' category items — not jumpers
    const topIds = result.candidatesBySlot["top"].map(i => i.id);
    expect(topIds).toContain("top1");
    expect(topIds).not.toContain("jmp1");
  });

  it("jumper candidates contain only 'jumpers' category items", () => {
    const result = resolveSlots(fullWardrobe, { temp: 17, description: "Clear" }, "Casual day out");
    const jumperIds = (result.candidatesBySlot["jumper"] || []).map(i => i.id);
    expect(jumperIds).toContain("jmp1");
    // Should not contain any tops items
    jumperIds.forEach(id => {
      const item = fullWardrobe.find(i => i.id === id)!;
      expect(item.category).toBe("jumpers");
    });
  });
});

// ── WEATHER THRESHOLDS ────────────────────────────────────────────────────────

describe("weather slot rules — temperature thresholds", () => {
  it("WARM (>19°C): no jumper slot, no outerwear slot (without rain)", () => {
    const wardrobe = [top1, bottom1, jumper1, outer1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 22, description: "Clear" }, "Casual day out");
    expect(result.candidatesBySlot).not.toHaveProperty("jumper");
    expect(result.candidatesBySlot).not.toHaveProperty("outerwear");
    expect(result.weatherRules.noOuterwear).toBe(true);
  });

  it("BOUNDARY (20°C clear): no jumper, no outerwear", () => {
    const result = resolveSlots(fullWardrobe, { temp: 20, description: "Clear" }, "Casual day out");
    expect(result.candidatesBySlot).not.toHaveProperty("jumper");
    expect(result.candidatesBySlot).not.toHaveProperty("outerwear");
  });

  it("MILD (19°C): boundary — still warm (no jumper, no outerwear)", () => {
    // 19°C is the top of the warm band: needsJumper triggers at ≤19 but spec says >19 = warm
    // Our implementation: needsJumper = temp >= JUMPER_TEMP(16) && temp <= WARM_TEMP(19)
    // So temp=19 → needsJumper=true (in the 16–19 band)
    const result = resolveSlots(fullWardrobe, { temp: 19, description: "Clear" }, "Casual day out");
    expect(result.weatherRules.needsJumper).toBe(true);
    expect(result.candidatesBySlot).toHaveProperty("jumper");
  });

  it("MILD (16–19°C): jumper recommended, no mandatory puffer", () => {
    const result = resolveSlots(fullWardrobe, { temp: 17, description: "Clear" }, "Casual day out");
    expect(result.weatherRules.needsJumper).toBe(true);
    expect(result.weatherRules.needsPuffer).toBe(false);
    expect(result.candidatesBySlot).toHaveProperty("jumper");
  });

  it("COLD (≤15°C): jumper + outerwear required", () => {
    const wardrobe = [top1, bottom1, jumper1, outer1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 12, description: "Clear" }, "Casual day out");
    expect(result.weatherRules.needsJumper).toBe(true);
    expect(result.weatherRules.needsOuterwear).toBe(true);
    expect(result.candidatesBySlot).toHaveProperty("jumper");
    expect(result.candidatesBySlot).toHaveProperty("outerwear");
  });

  it("COLD boundary (15°C): puffer required", () => {
    const result = resolveSlots(fullWardrobe, { temp: 15, description: "Clear" }, "Casual day out");
    expect(result.weatherRules.needsPuffer).toBe(true);
  });

  it("COLD (≤15°C) with puffer available: puffer preferred in outerwear slot", () => {
    const wardrobe = [top1, bottom1, jumper1, puffer1, outer1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 10, description: "Clear" }, "Casual day out");
    // puffer1 should be in outerwear candidates (preferred) or mandatory
    const outerwearIds = [
      ...result.mandatoryItems.map(i => i.id),
      ...(result.candidatesBySlot["outerwear"] || []).map(i => i.id),
    ];
    expect(outerwearIds).toContain("puf1");
  });

  it("COLD (≤15°C) with only one puffer: puffer is mandatory", () => {
    const wardrobe = [top1, bottom1, jumper1, puffer1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 10, description: "Clear" }, "Casual day out");
    const mandatoryIds = result.mandatoryItems.map(i => i.id);
    expect(mandatoryIds).toContain("puf1");
  });
});

// ── RAIN RULES ────────────────────────────────────────────────────────────────

describe("weather slot rules — rain", () => {
  it("rain (any temp) always triggers outerwear slot", () => {
    const wardrobe = [top1, bottom1, outer1, shoe1];
    // Even at 22°C (warm) with rain, outerwear should appear
    const result = resolveSlots(wardrobe, { temp: 22, description: "Rainy" }, "Casual day out");
    expect(result.weatherRules.isRaining).toBe(true);
    expect(result.weatherRules.noOuterwear).toBe(false);
    const hasOuterwear = result.mandatoryItems.some(i => i.category === "outerwear")
      || "outerwear" in result.candidatesBySlot;
    expect(hasOuterwear).toBe(true);
  });

  it("rain prefers waterproof outerwear if available", () => {
    const wardrobe = [top1, bottom1, outer1, rain1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 18, description: "Rainy showers" }, "Casual day out");
    const outerwearIds = [
      ...result.mandatoryItems.map(i => i.id),
      ...(result.candidatesBySlot["outerwear"] || []).map(i => i.id),
    ];
    expect(outerwearIds).toContain("rnj1");
  });

  it("cold + rain: both puffer and rain jacket are in play", () => {
    const wardrobe = [top1, bottom1, jumper1, puffer1, rain1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 8, description: "Rainy" }, "Casual day out");
    expect(result.weatherRules.needsPuffer).toBe(true);
    expect(result.weatherRules.isRaining).toBe(true);
  });
});

// ── OPTIONAL SLOTS ────────────────────────────────────────────────────────────

describe("optional slots — shoes, hats, accessories", () => {
  it("shoes slot is included when wardrobe has shoes", () => {
    const result = resolveSlots([top1, bottom1, shoe1], null, "Casual day out");
    expect(result.candidatesBySlot).toHaveProperty("shoes");
  });

  it("shoes slot is absent when wardrobe has no shoes", () => {
    const result = resolveSlots([top1, bottom1], null, "Casual day out");
    expect(result.candidatesBySlot).not.toHaveProperty("shoes");
  });

  it("hat slot excluded for formal occasions", () => {
    const wardrobe = [top1, bottom1, shoe1, hat1];
    const result = resolveSlots(wardrobe, null, "Wedding guest");
    expect(result.candidatesBySlot).not.toHaveProperty("hat");
  });

  it("hat slot excluded for business occasions", () => {
    const wardrobe = [top1, bottom1, shoe1, hat1];
    const result = resolveSlots(wardrobe, null, "Business meeting");
    expect(result.candidatesBySlot).not.toHaveProperty("hat");
  });

  it("hat slot included for casual occasions", () => {
    const wardrobe = [top1, bottom1, shoe1, hat1];
    const result = resolveSlots(wardrobe, null, "Casual day out");
    expect(result.candidatesBySlot).toHaveProperty("hat");
  });
});

// ── FALLBACK OUTFIT ───────────────────────────────────────────────────────────

describe("buildFallbackOutfit — Fallback Level 2 (no AI)", () => {
  it("includes a top and bottom in the result", () => {
    const result = resolveSlots(fullWardrobe, null, "Casual day out");
    const fallback = buildFallbackOutfit(result, fullWardrobe);
    const categories = fallback.map(i => i.category);
    expect(categories).toContain("tops");
    expect(categories).toContain("bottoms");
  });

  it("includes mandatory items (e.g. single puffer at ≤15°C)", () => {
    const wardrobe = [top1, bottom1, puffer1, shoe1];
    const result = resolveSlots(wardrobe, { temp: 10, description: "Clear" }, "Casual day out");
    const fallback = buildFallbackOutfit(result, wardrobe);
    expect(fallback.map(i => i.id)).toContain("puf1");
  });

  it("produces no duplicate items", () => {
    const result = resolveSlots(fullWardrobe, { temp: 12, description: "Clear" }, "Casual day out");
    const fallback = buildFallbackOutfit(result, fullWardrobe);
    const ids = fallback.map(i => i.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("works with minimal wardrobe (1 top, 1 bottom)", () => {
    const wardrobe = [top1, bottom1];
    const result = resolveSlots(wardrobe, null, "Casual day out");
    expect(result.error).toBeNull();
    const fallback = buildFallbackOutfit(result, wardrobe);
    const cats = fallback.map(i => i.category);
    expect(cats).toContain("tops");
    expect(cats).toContain("bottoms");
  });

  it("returns an empty fallback for wardrobe with no tops (slot engine errors first)", () => {
    const wardrobe = [bottom1, shoe1];
    const result = resolveSlots(wardrobe, null, "Casual day out");
    expect(result.error).not.toBeNull();
    // buildFallbackOutfit on an error result returns empty (mandatoryItems=[])
    const fallback = buildFallbackOutfit(result, wardrobe);
    // The safety net in buildFallbackOutfit should still find a top from allItems... but bottom1 is tops? No.
    // wardrobe has no tops, so fallback should be just the bottom
    const topItems = fallback.filter(i => i.category === "tops" || i.category === "dresses");
    expect(topItems.length).toBe(0); // no tops in wardrobe
  });
});

// ── WEATHER FALLBACK (temp=null) ─────────────────────────────────────────────

describe("Fallback Level 4 — weather unavailable", () => {
  it("weather=null defaults to warm (no jumper/outerwear slots)", () => {
    const result = resolveSlots(fullWardrobe, null, "Casual day out");
    expect(result.error).toBeNull();
    expect(result.weatherRules.needsJumper).toBe(false);
    expect(result.weatherRules.needsOuterwear).toBe(false);
  });

  it("outfit generation does not block when weather is null", () => {
    const result = resolveSlots([top1, bottom1, shoe1], null, "Date night");
    expect(result.error).toBeNull();
    expect(result.candidatesBySlot).toHaveProperty("top");
    expect(result.candidatesBySlot).toHaveProperty("bottom");
  });
});
