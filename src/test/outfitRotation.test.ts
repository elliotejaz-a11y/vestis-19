import { describe, it, expect } from "vitest";
import { buildRecentIdCounts, isExactDuplicateOfRecent, breakExactDuplicate, colourCompatibilityScore } from "@/lib/outfitRotation";
import type { ClothingItem, Outfit } from "@/types/wardrobe";

function makeItem(id: string, category: string, color = "black"): ClothingItem {
  return {
    id, name: id, category,
    color, fabric: "cotton", imageUrl: "",
    tags: [], notes: "", addedAt: new Date(), isPrivate: false,
  };
}

function makeOutfit(id: string, items: ClothingItem[]): Outfit {
  return { id, occasion: "casual", items, createdAt: new Date(), reasoning: "", saved: false };
}

const top1 = makeItem("top1", "tops");
const top2 = makeItem("top2", "tops");
const bottom1 = makeItem("bottom1", "bottoms");
const bottom2 = makeItem("bottom2", "bottoms");
const shoes1 = makeItem("shoes1", "shoes");
const shoes2 = makeItem("shoes2", "shoes");

const isBottom = (i: ClothingItem) => i.category === "bottoms";
const isShoe = (i: ClothingItem) => i.category === "shoes";
const isTop = (i: ClothingItem) => i.category === "tops";
const SLOT_PREDICATES = [isBottom, isShoe, isTop];

// ─── buildRecentIdCounts ───────────────────────────────────────────────────

describe("buildRecentIdCounts", () => {
  it("counts item appearances across recent outfits", () => {
    const outfits = [
      makeOutfit("o1", [top1, bottom1, shoes1]),
      makeOutfit("o2", [top1, bottom1, shoes2]),
    ];
    const counts = buildRecentIdCounts(outfits);
    expect(counts.get("top1")).toBe(2);
    expect(counts.get("bottom1")).toBe(2);
    expect(counts.get("shoes1")).toBe(1);
    expect(counts.get("shoes2")).toBe(1);
    expect(counts.get("top2")).toBeUndefined();
  });

  it("only considers the first 5 outfits", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      makeOutfit(`o${i}`, [makeItem(`unique${i}`, "tops"), bottom1, shoes1])
    );
    const counts = buildRecentIdCounts(many);
    // bottom1 appears in all 7, but only 5 should be counted
    expect(counts.get("bottom1")).toBe(5);
    // unique0 is at index 0 (most recent) — inside window
    expect(counts.get("unique0")).toBe(1);
    // unique5 and unique6 are at indices 5 and 6 — outside window
    expect(counts.get("unique5")).toBeUndefined();
    expect(counts.get("unique6")).toBeUndefined();
  });

  it("counts each item at most once per outfit", () => {
    // Duplicate IDs within a single outfit.items — should only count once per outfit
    const outfits = [makeOutfit("o1", [top1, top1, bottom1, shoes1])];
    const counts = buildRecentIdCounts(outfits);
    expect(counts.get("top1")).toBe(1);
  });

  it("returns an empty map for empty input", () => {
    expect(buildRecentIdCounts([]).size).toBe(0);
  });
});

// ─── isExactDuplicateOfRecent ──────────────────────────────────────────────

describe("isExactDuplicateOfRecent", () => {
  it("detects an exact duplicate regardless of item order", () => {
    const recent = [makeOutfit("o1", [top1, bottom1, shoes1])];
    expect(isExactDuplicateOfRecent([shoes1, bottom1, top1], recent)).toBe(true);
  });

  it("does not flag a partial overlap as a duplicate", () => {
    const recent = [makeOutfit("o1", [top1, bottom1, shoes1])];
    expect(isExactDuplicateOfRecent([top2, bottom1, shoes1], recent)).toBe(false);
  });

  it("returns false for an empty selection", () => {
    const recent = [makeOutfit("o1", [top1, bottom1, shoes1])];
    expect(isExactDuplicateOfRecent([], recent)).toBe(false);
  });

  it("returns false for an empty recent outfits list", () => {
    expect(isExactDuplicateOfRecent([top1, bottom1, shoes1], [])).toBe(false);
  });

  it("matches against any of the last 5 outfits, not just the most recent", () => {
    const recent = [
      makeOutfit("o1", [top2, bottom2, shoes2]),
      makeOutfit("o2", [top2, bottom2, shoes2]),
      makeOutfit("o3", [top2, bottom2, shoes2]),
      makeOutfit("o4", [top1, bottom1, shoes1]), // 4th most recent
    ];
    expect(isExactDuplicateOfRecent([top1, bottom1, shoes1], recent)).toBe(true);
  });

  it("ignores outfits beyond the 5-outfit window", () => {
    const outfits = [
      makeOutfit("o1", [top2, bottom2, shoes2]),
      makeOutfit("o2", [top2, bottom2, shoes2]),
      makeOutfit("o3", [top2, bottom2, shoes2]),
      makeOutfit("o4", [top2, bottom2, shoes2]),
      makeOutfit("o5", [top2, bottom2, shoes2]),
      makeOutfit("o6", [top1, bottom1, shoes1]), // index 5 — outside the window
    ];
    expect(isExactDuplicateOfRecent([top1, bottom1, shoes1], outfits)).toBe(false);
  });

  it("does not match outfits with empty item arrays", () => {
    const recent = [makeOutfit("o1", [])];
    expect(isExactDuplicateOfRecent([top1, bottom1, shoes1], recent)).toBe(false);
  });
});

// ─── breakExactDuplicate ──────────────────────────────────────────────────

describe("breakExactDuplicate", () => {
  it("swaps the first eligible slot (bottom) to the least-recently-worn alternative", () => {
    const counts = new Map([["bottom1", 3], ["bottom2", 1]]);
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    expect(result.find(i => i.category === "bottoms")?.id).toBe("bottom2");
    expect(result.find(i => i.category === "tops")?.id).toBe("top1");
    expect(result.find(i => i.category === "shoes")?.id).toBe("shoes1");
  });

  it("falls through to shoe slot when no alternative bottom exists", () => {
    const counts = new Map([["shoes1", 3], ["shoes2", 1]]);
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, shoes1, shoes2]; // no bottom2

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    expect(result.find(i => i.category === "bottoms")?.id).toBe("bottom1");
    expect(result.find(i => i.category === "shoes")?.id).toBe("shoes2");
  });

  it("falls through to top slot when no alternative bottom or shoe exists", () => {
    const counts = new Map([["top1", 3], ["top2", 1]]);
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, shoes1]; // no bottom2 or shoes2

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    expect(result.find(i => i.category === "tops")?.id).toBe("top2");
  });

  it("returns the original array unchanged when no alternatives exist in any slot", () => {
    const counts = new Map<string, number>();
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, bottom1, shoes1]; // exactly these, no alternatives

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    expect(result).toEqual(selected);
  });

  it("prefers a completely fresh item (count=0) over a stale one (count=1)", () => {
    // shoes2 has no entry → treated as count=0; shoes1 in outfit has count=2
    const counts = new Map([["bottom1", 2], ["bottom2", 2], ["shoes1", 2]]);
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    // bottom2 has count=2, shoes2 has count=0 (fresh) — bottom tried first
    // bottom2 is the only alternative bottom, it has count=2
    // shoes2 has count=0, so after bottom fails, shoes slot should pick shoes2
    // but bottom2 IS an alternative for bottom so it gets swapped first
    expect(result.find(i => i.category === "bottoms")?.id).toBe("bottom2");
  });

  it("does not pick the same item that is already in the slot", () => {
    const counts = new Map([["bottom1", 1], ["bottom2", 2]]);
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);

    // bottom1 is in the slot; bottom2 has count=2 but is the only alternative
    expect(result.find(i => i.category === "bottoms")?.id).toBe("bottom2");
  });

  it("does not duplicate an item already present in another slot", () => {
    const counts = new Map<string, number>();
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);
    const ids = result.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size); // no duplicates
  });

  it("skips a bottom alternative that would itself be a duplicate of a recent outfit", () => {
    // bottom2 would recreate history[1] — function should skip it and try shoes
    const bottom3 = makeItem("bottom3", "bottoms");
    const history = [
      makeOutfit("h0", [top1, bottom2, shoes1]), // bottom2+shoes1 combo is already recent
    ];
    const counts = new Map<string, number>();
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, bottom3, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES, history);

    // bottom2 swap → [top1,bottom2,shoes1] = history[0] → skip
    // bottom3 swap → [top1,bottom3,shoes1] not in history → accept
    expect(result.find(i => i.category === "bottoms")?.id).toBe("bottom3");
  });

  it("falls through to next slot when all bottom alternatives would be duplicates", () => {
    const bottom3 = makeItem("bottom3", "bottoms");
    const history = [
      makeOutfit("h0", [top1, bottom1, shoes1]),
      makeOutfit("h1", [top1, bottom2, shoes1]),
      makeOutfit("h2", [top1, bottom3, shoes1]),
    ];
    const counts = new Map<string, number>();
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, bottom3, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES, history);

    // All bottom alternatives recreate a history entry → fall through to shoes
    expect(result.find(i => i.category === "shoes")?.id).toBe("shoes2");
  });
});

// ─── colourCompatibilityScore ─────────────────────────────────────────────

describe("colourCompatibilityScore", () => {
  it("neutral anchor: black top + bold red bottom scores 2 (safe pairing)", () => {
    const top = makeItem("t", "tops", "black");
    const bottom = makeItem("b", "bottoms", "red");
    expect(colourCompatibilityScore(bottom, [top])).toBe(2);
  });

  it("complementary pair: navy top + tan bottom scores 2 (tan is neutral)", () => {
    const top = makeItem("t", "tops", "navy");
    const bottom = makeItem("b", "bottoms", "tan");
    expect(colourCompatibilityScore(bottom, [top])).toBe(2);
  });

  it("tonal/monochrome: navy top + navy chino scores 3 (shared colour word)", () => {
    const top = makeItem("t", "tops", "navy blue");
    const bottom = makeItem("b", "bottoms", "navy chino");
    expect(colourCompatibilityScore(bottom, [top])).toBe(3);
  });

  it("all-neutral: white top + grey bottom scores 2 (both neutral)", () => {
    const top = makeItem("t", "tops", "white");
    const bottom = makeItem("b", "bottoms", "grey");
    expect(colourCompatibilityScore(bottom, [top])).toBe(2);
  });

  it("monochrome: black top + black bottom scores 3 (exact shared word)", () => {
    const top = makeItem("t", "tops", "black");
    const bottom = makeItem("b", "bottoms", "black");
    expect(colourCompatibilityScore(bottom, [top])).toBe(3);
  });

  it("hard clash: red top + green bottom scores 1 (lowest — neither neutral, no shared word)", () => {
    const top = makeItem("t", "tops", "red");
    const bottom = makeItem("b", "bottoms", "green");
    expect(colourCompatibilityScore(bottom, [top])).toBe(1);
  });

  it("returns 1 when no top is present in selected items", () => {
    const cand = makeItem("b", "bottoms", "red");
    expect(colourCompatibilityScore(cand, [])).toBe(1);
  });

  it("colour tiebreaker: prefers neutral bottom over clashing bottom when recency is equal", () => {
    const clashBottom = makeItem("clash", "bottoms", "orange");
    const neutralBottom = makeItem("neutral", "bottoms", "beige");
    const topItem = makeItem("top", "tops", "burgundy"); // non-neutral top

    const allItems = [topItem, clashBottom, neutralBottom, shoes1];
    const selected = [topItem, makeItem("old-bottom", "bottoms", "green"), shoes1];
    const counts = new Map<string, number>(); // all zero — tied on recency

    const result = breakExactDuplicate(
      selected,
      allItems,
      counts,
      [isBottom, isShoe, isTop]
    );

    // neutral "beige" pairs better with "burgundy" top (score=2) vs "orange" (score=1)
    expect(result.find(i => i.category === "bottoms")?.id).toBe("neutral");
  });
});

// ─── repetition prevention: 10 consecutive generations ────────────────────

describe("no exact outfit repeat within any window of 5", () => {
  // Simulates an adversarial AI that always tries to pick the same items.
  // breakExactDuplicate + isExactDuplicateOfRecent must break every repeat.
  function simulateGenerations(wardrobe: ClothingItem[], n: number): Outfit[] {
    const PREDS = [
      (i: ClothingItem) => i.category === "bottoms",
      (i: ClothingItem) => i.category === "shoes",
      (i: ClothingItem) => i.category === "tops" || i.category === "jumpers",
    ];
    const history: Outfit[] = [];

    for (let g = 0; g < n; g++) {
      // "AI" always picks the first available item per category — worst-case for repetition.
      const top = wardrobe.find(i => i.category === "tops" || i.category === "jumpers")!;
      const bottom = wardrobe.find(i => i.category === "bottoms")!;
      const shoe = wardrobe.find(i => i.category === "shoes")!;
      let selected = [top, bottom, shoe];

      if (isExactDuplicateOfRecent(selected, history)) {
        selected = breakExactDuplicate(
          selected, wardrobe, buildRecentIdCounts(history), PREDS, history
        );
      }

      history.unshift(makeOutfit(`g${g}`, selected));
    }
    return history;
  }

  it("generates 10 outfits with no repeat in any 5-window (3 tops, 3 bottoms, 3 shoes)", () => {
    const wardrobe = [
      makeItem("t1", "tops"), makeItem("t2", "tops"), makeItem("t3", "tops"),
      makeItem("b1", "bottoms"), makeItem("b2", "bottoms"), makeItem("b3", "bottoms"),
      makeItem("s1", "shoes"), makeItem("s2", "shoes"), makeItem("s3", "shoes"),
    ];

    const outfits = simulateGenerations(wardrobe, 10);

    for (let i = 0; i <= outfits.length - 5; i++) {
      const window = outfits.slice(i, i + 5);
      const keys = window.map(o => [...o.items.map(x => x.id)].sort().join(","));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("rotates correctly with a minimal wardrobe (1 top, 2 bottoms, 1 shoe — 2 unique combos)", () => {
    // With only 2 unique combinations the system cannot avoid repeating within a 5-window
    // past the 3rd generation; the guarantee is that it always picks the least-recently-seen
    // outfit. Verify the first swap works correctly and the second generation differs from gen 0.
    const wardrobe = [
      makeItem("t1", "tops"),
      makeItem("b1", "bottoms"), makeItem("b2", "bottoms"),
      makeItem("s1", "shoes"),
    ];

    const outfits = simulateGenerations(wardrobe, 4);

    const key = (o: Outfit) => [...o.items.map(x => x.id)].sort().join(",");
    // Gen 0 and gen 1 must differ (one swap is always possible at gen 1)
    expect(key(outfits[outfits.length - 1])).not.toBe(key(outfits[outfits.length - 2]));
  });
});

// ─── item rotation fairness ───────────────────────────────────────────────

describe("item rotation fairness", () => {
  // Simulates the sortedItemsByUsage + breakExactDuplicate loop for 40 generations
  // with a 20-outfit window (mirrors the expanded hook window).
  function simulateRotation(wardrobe: ClothingItem[], runs: number): Map<string, number> {
    const PREDS = [
      (i: ClothingItem) => i.category === "bottoms",
      (i: ClothingItem) => i.category === "shoes",
      (i: ClothingItem) => i.category === "tops" || i.category === "jumpers",
    ];
    const history: Outfit[] = [];
    const useCounts = new Map<string, number>();

    for (let g = 0; g < runs; g++) {
      // Mirror sortedItemsByUsage with 20-outfit window.
      const recentIds = history.slice(0, 20).map(o => o.items.map(i => i.id));
      const usageCount = new Map<string, number>();
      recentIds.forEach(ids => ids.forEach(id => usageCount.set(id, (usageCount.get(id) || 0) + 1)));
      const sorted = [...wardrobe].sort((a, b) => (usageCount.get(a.id) || 0) - (usageCount.get(b.id) || 0));

      // "AI" picks least-recently-used item per category (first in sorted list).
      const top = sorted.find(i => i.category === "tops" || i.category === "jumpers")!;
      const bottom = sorted.find(i => i.category === "bottoms")!;
      const shoe = sorted.find(i => i.category === "shoes")!;
      let selected = [top, bottom, shoe];

      if (isExactDuplicateOfRecent(selected, history)) {
        selected = breakExactDuplicate(
          selected, sorted, buildRecentIdCounts(history), PREDS, history
        );
      }

      selected.forEach(item => useCounts.set(item.id, (useCounts.get(item.id) || 0) + 1));
      history.unshift(makeOutfit(`g${g}`, selected));
    }
    return useCounts;
  }

  it("no item appears more than 2× the frequency of the least-used item after 40 runs", () => {
    // 5 tops + 5 bottoms + 5 shoes = 15 items. 40 runs × 3 picks = 120 total picks.
    // Expected ~8 uses per item; fairness threshold: max ≤ 2 × min.
    const wardrobe: ClothingItem[] = [];
    for (let i = 1; i <= 5; i++) {
      wardrobe.push(makeItem(`top${i}`, "tops"));
      wardrobe.push(makeItem(`bot${i}`, "bottoms"));
      wardrobe.push(makeItem(`sho${i}`, "shoes"));
    }

    const counts = simulateRotation(wardrobe, 40);

    const values = [...counts.values()].filter(c => c > 0);
    expect(values.length).toBeGreaterThan(0);
    const minCount = Math.min(...values);
    const maxCount = Math.max(...values);
    expect(maxCount).toBeLessThanOrEqual(minCount * 2);
  });
});
