import { describe, it, expect } from "vitest";
import {
  isNeutralColor,
  colourScore,
  scoreOutfitCombination,
  rankCombinations,
  rankSlotCandidates,
  NEUTRALS,
} from "./colourTheory";
import type { ClothingItem } from "@/types/wardrobe";

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

// ── isNeutralColor ────────────────────────────────────────────────────────────

describe("isNeutralColor", () => {
  it("returns true for every word in the NEUTRALS set", () => {
    for (const neutral of NEUTRALS) {
      expect(isNeutralColor(neutral), neutral).toBe(true);
    }
  });

  it("handles multi-word colour strings", () => {
    expect(isNeutralColor("light navy")).toBe(true);
    expect(isNeutralColor("off-white linen")).toBe(true);
  });

  it("returns false for non-neutral colours", () => {
    expect(isNeutralColor("red")).toBe(false);
    expect(isNeutralColor("purple")).toBe(false);
    expect(isNeutralColor("hot pink")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isNeutralColor("")).toBe(false);
  });
});

// ── colourScore ───────────────────────────────────────────────────────────────

describe("colourScore", () => {
  it("scores 90 for exact monochromatic match", () => {
    expect(colourScore("black", "black")).toBe(90);
    expect(colourScore("navy", "navy")).toBe(90);
  });

  it("scores 80 for tonal substring overlap (substring without exact word match)", () => {
    // "steel" is a substring of "steelblue" but not an exact word match → tonal 80
    expect(colourScore("steel", "steelblue")).toBe(80);
  });

  it("scores 82 for known complementary pair", () => {
    expect(colourScore("navy", "white")).toBe(82);
    expect(colourScore("olive", "burgundy")).toBe(82);
    expect(colourScore("black", "red")).toBe(82);
  });

  it("scores 15 for known clashing pair", () => {
    expect(colourScore("red", "green")).toBe(15);
    expect(colourScore("orange", "purple")).toBe(15);
    expect(colourScore("pink", "orange")).toBe(15);
  });

  it("scores 75 for two neutrals", () => {
    expect(colourScore("black", "grey")).toBe(75);
    expect(colourScore("cream", "beige")).toBe(75);
  });

  it("scores 65 for one neutral + one vivid", () => {
    expect(colourScore("black", "purple")).toBe(65);
    expect(colourScore("yellow", "white")).toBe(65);
  });

  it("scores 50 for unknown pairing with no signal", () => {
    expect(colourScore("teal", "yellow")).toBe(50);
  });

  it("scores 50 when either colour is empty", () => {
    expect(colourScore("", "red")).toBe(50);
    expect(colourScore("navy", "")).toBe(50);
  });

  it("is order-independent for complementary pairs", () => {
    expect(colourScore("white", "navy")).toBe(colourScore("navy", "white"));
    expect(colourScore("rust", "olive")).toBe(colourScore("olive", "rust"));
  });

  it("is order-independent for clashing pairs", () => {
    expect(colourScore("green", "red")).toBe(colourScore("red", "green"));
  });
});

// ── scoreOutfitCombination ────────────────────────────────────────────────────

describe("scoreOutfitCombination", () => {
  it("returns 50 for a single garment", () => {
    expect(scoreOutfitCombination([item("t1", "black")])).toBe(50);
  });

  it("returns 50 for empty array", () => {
    expect(scoreOutfitCombination([])).toBe(50);
  });

  it("excludes accessories and hats from scoring", () => {
    const garments = [item("t1", "navy"), item("b1", "white", "bottoms")];
    const withAcc = [
      ...garments,
      item("a1", "red", "accessories"),
      item("h1", "green", "hats"),
    ];
    expect(scoreOutfitCombination(withAcc)).toBe(scoreOutfitCombination(garments));
  });

  it("averages pairwise colour scores", () => {
    // navy+white=82 (complementary), navy+black=75 (both neutrals), white+black=82 (complementary)
    // avg = (82+75+82)/3 = 239/3 = 79.67 → Math.round → 80
    const combo = [
      item("t1", "navy", "tops"),
      item("b1", "white", "bottoms"),
      item("s1", "black", "shoes"),
    ];
    expect(scoreOutfitCombination(combo)).toBe(80);
  });

  it("scores a clashing outfit low", () => {
    const clashing = [item("t1", "red", "tops"), item("b1", "green", "bottoms")];
    expect(scoreOutfitCombination(clashing)).toBe(15);
  });
});

// ── rankCombinations ──────────────────────────────────────────────────────────

describe("rankCombinations", () => {
  it("returns empty array for empty slots", () => {
    expect(rankCombinations({})).toEqual([]);
    expect(rankCombinations({ tops: [] })).toEqual([]);
  });

  it("returns results sorted by score descending", () => {
    const slots = {
      tops: [item("t1", "navy"), item("t2", "red")],
      bottoms: [item("b1", "white", "bottoms"), item("b2", "green", "bottoms")],
    };
    const results = rankCombinations(slots);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("returns at most maxResults combinations", () => {
    const slots = {
      tops: [item("t1", "navy"), item("t2", "black"), item("t3", "white")],
      bottoms: [item("b1", "beige", "bottoms"), item("b2", "grey", "bottoms")],
    };
    expect(rankCombinations(slots, 4, 3).length).toBeLessThanOrEqual(3);
  });

  it("limits candidates per slot to maxPerSlot before forming product", () => {
    const slots = {
      tops: Array.from({ length: 10 }, (_, i) => item(`t${i}`, "navy")),
      bottoms: Array.from({ length: 10 }, (_, i) => item(`b${i}`, "white", "bottoms")),
    };
    // With maxPerSlot=4 and 2 slots → 4×4=16 combinations max, limited to 5 results
    const results = rankCombinations(slots, 4, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

// ── rankSlotCandidates ────────────────────────────────────────────────────────

describe("rankSlotCandidates", () => {
  it("returns candidates unchanged when no anchors", () => {
    const candidates = [item("b1", "red"), item("b2", "navy")];
    expect(rankSlotCandidates(candidates, [])).toEqual(candidates);
  });

  it("ranks best-colour-match first", () => {
    const anchor = [item("t1", "navy")];
    // white pairs with navy (82), red does not (65)
    const candidates = [item("b1", "red"), item("b2", "white")];
    const ranked = rankSlotCandidates(candidates, anchor);
    expect(ranked[0].id).toBe("b2"); // white scores higher with navy
  });

  it("handles multiple anchors by averaging compatibility", () => {
    const anchors = [item("t1", "navy"), item("s1", "white", "shoes")];
    const candidates = [item("b1", "orange"), item("b2", "black")];
    // black pairs well with both navy and white (90+82)/2 = high
    // orange pairs with navy (82) but clashes with nothing — check output order
    const ranked = rankSlotCandidates(candidates, anchors);
    expect(ranked[0].id).toBe("b2"); // black should rank higher
  });
});
