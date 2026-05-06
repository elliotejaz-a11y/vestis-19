import { describe, it, expect } from "vitest";
import { buildRecentIdCounts, isExactDuplicateOfRecent, breakExactDuplicate } from "@/lib/outfitRotation";
import type { ClothingItem, Outfit } from "@/types/wardrobe";

function makeItem(id: string, category: string): ClothingItem {
  return {
    id, name: id, category,
    color: "black", fabric: "cotton", imageUrl: "",
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
    // If top1 is in both top slot and (somehow) allItems would suggest it for bottom — shouldn't happen
    // by category, but we test the general case: currentIds excludes all items in outfit
    const counts = new Map<string, number>();
    const selected = [top1, bottom1, shoes1];
    const allItems = [top1, top2, bottom1, bottom2, shoes1, shoes2];

    const result = breakExactDuplicate(selected, allItems, counts, SLOT_PREDICATES);
    const ids = result.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size); // no duplicates
  });
});
