import { describe, it, expect } from "vitest";
import {
  colourCompatibilityScore,
  buildRecentIdCounts,
  isExactDuplicateOfRecent,
  breakExactDuplicate,
} from "./outfitRotation";
import type { ClothingItem, Outfit } from "@/types/wardrobe";

// ── Helpers ──────────────────────────────────────────────────────────────────

function item(id: string, color: string, category = "tops"): ClothingItem {
  return {
    id,
    name: id,
    category,
    color,
    fabric: "cotton",
    imageUrl: "",
    tags: [],
    notes: "",
    addedAt: new Date(),
  };
}

function outfit(id: string, items: ClothingItem[]): Outfit {
  return {
    id,
    occasion: "Casual day out",
    items,
    createdAt: new Date(),
    reasoning: "",
  };
}

// ── colourCompatibilityScore ─────────────────────────────────────────────────

describe("colourCompatibilityScore", () => {
  it("returns 1 when no top is in selectedItems", () => {
    const candidate = item("b1", "navy", "bottoms");
    const selected = [item("s1", "white", "shoes")];
    expect(colourCompatibilityScore(candidate, selected)).toBe(1);
  });

  it("returns 3 for shared colour word with the top (tonal/monochrome)", () => {
    const candidate = item("b1", "navy chino", "bottoms");
    const selected = [item("t1", "navy", "tops")];
    expect(colourCompatibilityScore(candidate, selected)).toBe(3);
  });

  it("returns 2 when at least one side is a neutral", () => {
    const candidate = item("b1", "black", "bottoms");
    const selected = [item("t1", "red", "tops")];
    // black is neutral → score 2
    expect(colourCompatibilityScore(candidate, selected)).toBe(2);
  });

  it("returns 1 for two non-neutral non-matching colours", () => {
    const candidate = item("b1", "purple", "bottoms");
    const selected = [item("t1", "yellow", "tops")];
    expect(colourCompatibilityScore(candidate, selected)).toBe(1);
  });

  it("recognises jumpers as the 'top' anchor", () => {
    const candidate = item("b1", "navy", "bottoms");
    const selected = [item("j1", "navy", "jumpers")];
    expect(colourCompatibilityScore(candidate, selected)).toBe(3);
  });
});

// ── buildRecentIdCounts ───────────────────────────────────────────────────────

describe("buildRecentIdCounts", () => {
  it("returns empty map for no outfits", () => {
    expect(buildRecentIdCounts([])).toEqual(new Map());
  });

  it("counts each unique item id per outfit (not per item occurrence)", () => {
    const items = [item("t1", "black"), item("b1", "white", "bottoms")];
    const recent = [outfit("o1", items), outfit("o2", [items[0]])];
    const counts = buildRecentIdCounts(recent);
    expect(counts.get("t1")).toBe(2);
    expect(counts.get("b1")).toBe(1);
  });

  it("only considers the last 5 outfits", () => {
    const t1 = item("t1", "black");
    // 6 outfits all containing t1 — only first 5 should count
    const many = Array.from({ length: 6 }, (_, i) => outfit(`o${i}`, [t1]));
    const counts = buildRecentIdCounts(many);
    expect(counts.get("t1")).toBe(5);
  });

  it("deduplicates item ids within a single outfit", () => {
    // Same item listed twice in one outfit should only count once per outfit
    const t1 = item("t1", "black");
    const counts = buildRecentIdCounts([outfit("o1", [t1, t1])]);
    expect(counts.get("t1")).toBe(1);
  });
});

// ── isExactDuplicateOfRecent ──────────────────────────────────────────────────

describe("isExactDuplicateOfRecent", () => {
  it("returns false for empty selectedItems", () => {
    const recent = [outfit("o1", [item("t1", "black")])];
    expect(isExactDuplicateOfRecent([], recent)).toBe(false);
  });

  it("returns false when no recent outfits", () => {
    expect(isExactDuplicateOfRecent([item("t1", "black")], [])).toBe(false);
  });

  it("returns true when selected items exactly match a recent outfit (order-independent)", () => {
    const t1 = item("t1", "black");
    const b1 = item("b1", "white", "bottoms");
    const recent = [outfit("o1", [t1, b1])];
    expect(isExactDuplicateOfRecent([b1, t1], recent)).toBe(true);
  });

  it("returns false when selected items differ by one from recent", () => {
    const t1 = item("t1", "black");
    const b1 = item("b1", "white", "bottoms");
    const b2 = item("b2", "navy", "bottoms");
    const recent = [outfit("o1", [t1, b1])];
    expect(isExactDuplicateOfRecent([t1, b2], recent)).toBe(false);
  });

  it("only checks the last 5 outfits", () => {
    const t1 = item("t1", "black");
    // The matching outfit is the 6th (index 5) — should NOT be detected
    const recent = [
      outfit("o1", [item("a", "red")]),
      outfit("o2", [item("b", "blue")]),
      outfit("o3", [item("c", "green")]),
      outfit("o4", [item("d", "white", "bottoms")]),
      outfit("o5", [item("e", "navy")]),
      outfit("o6", [t1]), // beyond the 5-outfit window
    ];
    expect(isExactDuplicateOfRecent([t1], recent)).toBe(false);
  });
});

// ── breakExactDuplicate ───────────────────────────────────────────────────────

describe("breakExactDuplicate", () => {
  const top = item("t1", "black");
  const bottom1 = item("b1", "white", "bottoms");
  const bottom2 = item("b2", "navy", "bottoms");
  const isBottom = (i: ClothingItem) => i.category === "bottoms";

  it("returns original array unchanged when no alternatives exist", () => {
    const result = breakExactDuplicate(
      [top, bottom1],
      [top, bottom1],        // only these two items in wardrobe
      new Map(),
      [isBottom]
    );
    expect(result).toEqual([top, bottom1]);
  });

  it("swaps the slot to a less-recently-worn alternative", () => {
    const counts = new Map([["b1", 3], ["b2", 0]]); // b2 less recently worn
    const result = breakExactDuplicate(
      [top, bottom1],
      [top, bottom1, bottom2],
      counts,
      [isBottom]
    );
    expect(result.find(isBottom)?.id).toBe("b2");
  });

  it("skips a swap candidate that would itself be a duplicate", () => {
    const altBottom = item("b3", "grey", "bottoms");
    const recent = [outfit("o1", [top, bottom2])]; // b2 already a recent combo
    const counts = new Map<string, number>();
    const result = breakExactDuplicate(
      [top, bottom1],
      [top, bottom1, bottom2, altBottom],
      counts,
      [isBottom],
      recent
    );
    // b2 would recreate a duplicate of o1 — should skip to altBottom
    expect(result.find(isBottom)?.id).toBe("b3");
  });

  it("tries slots in priority order and returns on first successful swap", () => {
    const shoe1 = item("s1", "white", "shoes");
    const shoe2 = item("s2", "black", "shoes");
    const isShoe = (i: ClothingItem) => i.category === "shoes";
    const counts = new Map<string, number>();
    const result = breakExactDuplicate(
      [top, bottom1, shoe1],
      [top, bottom1, shoe1, bottom2, shoe2],
      counts,
      [isBottom, isShoe] // bottom slot tried first
    );
    // Should swap bottom, not shoe
    expect(result.find(isBottom)?.id).toBe("b2");
    expect(result.find(isShoe)?.id).toBe("s1"); // shoe unchanged
  });
});
