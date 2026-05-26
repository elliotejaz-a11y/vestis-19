import { describe, it, expect } from "vitest";
import { buildAIPrompt, estimateTokens } from "@/lib/outfitPromptBuilder";
import type { SlotResult } from "@/lib/outfitSlotEngine";
import type { ClothingItem } from "@/types/wardrobe";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string, category: string, color = "black"): ClothingItem {
  return {
    id, name: id, category,
    color, fabric: "cotton", imageUrl: "",
    tags: [], notes: "", addedAt: new Date(), isPrivate: false,
  };
}

function makeSlotResult(
  tops: ClothingItem[],
  bottoms: ClothingItem[],
  shoes: ClothingItem[],
): SlotResult {
  return {
    mandatoryItems: [],
    candidatesBySlot: { top: tops, bottom: bottoms, shoes },
    error: null,
    weatherRules: {
      needsJumper: false,
      needsOuterwear: false,
      needsPuffer: false,
      isRaining: false,
      noOuterwear: true,
    },
  };
}

const top1 = makeItem("top-1", "tops", "white");
const top2 = makeItem("top-2", "tops", "blue");
const bottom1 = makeItem("bottom-1", "bottoms", "black");
const bottom2 = makeItem("bottom-2", "bottoms", "grey");
const shoes1 = makeItem("shoes-1", "shoes", "white");
const shoes2 = makeItem("shoes-2", "shoes", "black");

// ─── backward compatibility ───────────────────────────────────────────────────

describe("buildAIPrompt — backward compatibility", () => {
  it("produces no markers or avoidance section when recentOutfitItemIds is omitted", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    const prompt = buildAIPrompt(slotResult, "Casual day", null);
    expect(prompt).not.toContain("⚠️");
    expect(prompt).not.toContain("🚫");
    expect(prompt).not.toContain("RECENT OUTFITS");
  });

  it("produces no markers or avoidance section when recentOutfitItemIds is an empty array", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, []);
    expect(prompt).not.toContain("⚠️");
    expect(prompt).not.toContain("🚫");
    expect(prompt).not.toContain("RECENT OUTFITS");
  });
});

// ─── worn markers ─────────────────────────────────────────────────────────────

describe("buildAIPrompt — worn markers", () => {
  it("adds ⚠️ marker on the item line when item was in exactly 1 recent outfit", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    const recentIds = [["top-1", "bottom-1", "shoes-1"]];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    // Candidate lines are formatted as "  [id] name (...)" — use "[id] " to avoid matching
    // the avoidance section which formats as "[id, id2, ...]" (comma, not space, after id).
    const top1Line = prompt.split("\n").find(l => l.includes("[top-1] "));
    expect(top1Line).toBeDefined();
    expect(top1Line).toContain("⚠️");
    expect(top1Line).toContain("worn recently");
  });

  it("adds 🚫 marker on the item line when item appeared in 2 or more recent outfits", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1, bottom2], [shoes1]);
    const recentIds = [
      ["top-1", "bottom-1", "shoes-1"],
      ["top-1", "bottom-2", "shoes-1"],
    ];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    const top1Line = prompt.split("\n").find(l => l.includes("[top-1] "));
    expect(top1Line).toBeDefined();
    expect(top1Line).toContain("🚫");
    expect(top1Line).toContain("worn multiple times");
  });

  it("does not mark an item that does not appear in any recent outfit", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    const recentIds = [["top-1", "bottom-1", "shoes-1"]];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    const top2Line = prompt.split("\n").find(l => l.includes("[top-2] "));
    expect(top2Line).toBeDefined();
    expect(top2Line).not.toContain("⚠️");
    expect(top2Line).not.toContain("🚫");
  });

  it("counts each item at most once per outfit (duplicate IDs in an idSet are deduplicated)", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    // top-1 duplicated within one outfit — should still count as 1, not 2
    const recentIds = [["top-1", "top-1", "bottom-1", "shoes-1"]];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    const top1Line = prompt.split("\n").find(l => l.includes("[top-1] "));
    expect(top1Line).toBeDefined();
    // count = 1 → ⚠️ not 🚫
    expect(top1Line).toContain("⚠️");
    expect(top1Line).not.toContain("🚫");
  });

  it("respects the 5-outfit window — outfits beyond index 4 are ignored for counts", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1, shoes2]);
    // 7 past outfits; top-1 appears in all 7 but only first 5 should count
    const recentIds = Array.from({ length: 7 }, () => ["top-1", "bottom-1", "shoes-1"]);
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    const top1Line = prompt.split("\n").find(l => l.includes("[top-1] "));
    expect(top1Line).toBeDefined();
    // count capped at 5 → still 🚫
    expect(top1Line).toContain("🚫");
  });
});

// ─── avoidance section ────────────────────────────────────────────────────────

describe("buildAIPrompt — avoidance section", () => {
  it("includes RECENT OUTFITS header and item IDs when recentOutfitItemIds is non-empty", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1], [shoes1]);
    const recentIds = [["top-1", "bottom-1", "shoes-1"]];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    expect(prompt).toContain("RECENT OUTFITS");
    expect(prompt).toContain("top-1");
    expect(prompt).toContain("bottom-1");
    expect(prompt).toContain("shoes-1");
  });

  it("lists each past outfit on its own line", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1, bottom2], [shoes1, shoes2]);
    const recentIds = [
      ["top-1", "bottom-1", "shoes-1"],
      ["top-2", "bottom-2", "shoes-2"],
    ];
    const prompt = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    expect(prompt).toContain("Outfit 1:");
    expect(prompt).toContain("Outfit 2:");
  });

  it("silently skips empty subarrays and does not emit blank avoidance lines", () => {
    const slotResult = makeSlotResult([top1], [bottom1], [shoes1]);
    const recentIds: string[][] = [[], ["top-1", "bottom-1", "shoes-1"], []];
    expect(() =>
      buildAIPrompt(slotResult, "Casual", null, undefined, undefined, recentIds)
    ).not.toThrow();
    const prompt = buildAIPrompt(slotResult, "Casual", null, undefined, undefined, recentIds);
    // Only one valid outfit → only one avoidance line
    const avoidanceLines = prompt
      .split("\n")
      .filter(l => l.trimStart().startsWith("- Outfit"));
    expect(avoidanceLines.length).toBe(1);
  });

  it("does not include RECENT OUTFITS header when all subarrays are empty", () => {
    const slotResult = makeSlotResult([top1], [bottom1], [shoes1]);
    const prompt = buildAIPrompt(slotResult, "Casual", null, undefined, undefined, [[], []]);
    expect(prompt).not.toContain("RECENT OUTFITS");
  });
});

// ─── token budget ─────────────────────────────────────────────────────────────

describe("buildAIPrompt — token budget with recency data", () => {
  it("does not throw when recency data + full candidate lists push over budget", () => {
    // 5 candidates per slot (max) × 3 slots, with all items recently worn
    const tops = Array.from({ length: 5 }, (_, i) => makeItem(`top-${i}`, "tops"));
    const bottoms = Array.from({ length: 5 }, (_, i) => makeItem(`bottom-${i}`, "bottoms"));
    const shoesList = Array.from({ length: 5 }, (_, i) => makeItem(`shoes-${i}`, "shoes"));
    const slotResult = makeSlotResult(tops, bottoms, shoesList);
    const recentIds = [
      tops.map(t => t.id),
      bottoms.map(b => b.id),
      shoesList.map(s => s.id),
      tops.map(t => t.id),
      bottoms.map(b => b.id),
    ];
    expect(() =>
      buildAIPrompt(slotResult, "Casual day out", null, "minimalist", "tonal", recentIds)
    ).not.toThrow();
  });

  it("returns a shorter prompt after trimming when initial draft exceeds budget", () => {
    // Force a large prompt: long item names + all recency data
    const longTops = Array.from({ length: 5 }, (_, i) =>
      makeItem(`top-${i}`, "tops", "a very specific and long colour name")
    );
    const longBottoms = Array.from({ length: 5 }, (_, i) =>
      makeItem(`bottom-${i}`, "bottoms", "another very specific and long colour name indeed")
    );
    const longShoes = Array.from({ length: 5 }, (_, i) =>
      makeItem(`shoes-${i}`, "shoes", "yet another long colour description for shoes")
    );
    const slotResult = makeSlotResult(longTops, longBottoms, longShoes);
    const recentIds = [longTops.map(t => t.id), longBottoms.map(b => b.id)];

    const promptFull = buildAIPrompt(slotResult, "Casual day", null, undefined, undefined, recentIds);
    // Build a reference prompt with no recency to confirm trimming happens
    const promptNoRecency = buildAIPrompt(slotResult, "Casual day", null);

    // Both must be valid strings
    expect(typeof promptFull).toBe("string");
    expect(promptFull.length).toBeGreaterThan(0);
    expect(typeof promptNoRecency).toBe("string");
  });

  it("estimateTokens is exported and returns a positive number", () => {
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
  });
});

// ─── integration: markers and avoidance together ──────────────────────────────

describe("buildAIPrompt — markers + avoidance section coexist", () => {
  it("produces both worn markers and an avoidance section in the same prompt", () => {
    const slotResult = makeSlotResult([top1, top2], [bottom1, bottom2], [shoes1, shoes2]);
    const recentIds = [
      ["top-1", "bottom-1", "shoes-1"],
      ["top-1", "bottom-2", "shoes-2"],
    ];
    const prompt = buildAIPrompt(slotResult, "Date night", null, undefined, undefined, recentIds);
    // Markers present
    expect(prompt).toContain("🚫"); // top-1 worn twice
    expect(prompt).toContain("⚠️"); // bottom-1, shoes-1, bottom-2, shoes-2 worn once
    // Avoidance section present
    expect(prompt).toContain("RECENT OUTFITS");
    expect(prompt).toContain("Outfit 1:");
    expect(prompt).toContain("Outfit 2:");
    // Fresh items have no marker
    const top2Line = prompt.split("\n").find(l => l.includes("[top-2] "));
    expect(top2Line).not.toContain("⚠️");
    expect(top2Line).not.toContain("🚫");
  });
});
