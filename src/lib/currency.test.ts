import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing currency so refreshRatesIfNeeded doesn't fire
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: new Error("mocked") }),
    },
  },
}));

import { convertPrice, formatPrice, getCurrencySymbol } from "./currency";

// The module initialises with fallback rates: NZD=1, USD=0.56, EUR=0.52

describe("convertPrice", () => {
  it("returns price unchanged for NZD (rate 1)", () => {
    expect(convertPrice(100, "NZD")).toBe(100);
  });

  it("converts NZD to USD using fallback rate 0.56", () => {
    expect(convertPrice(100, "USD")).toBeCloseTo(56, 5);
  });

  it("converts NZD to EUR using fallback rate 0.52", () => {
    expect(convertPrice(100, "EUR")).toBeCloseTo(52, 5);
  });

  it("falls back to rate 1 for unknown currency", () => {
    expect(convertPrice(100, "JPY")).toBe(100);
  });

  it("handles zero price", () => {
    expect(convertPrice(0, "USD")).toBe(0);
  });
});

describe("formatPrice", () => {
  it("formats NZD with $ symbol", () => {
    expect(formatPrice(100, "NZD")).toBe("$100");
  });

  it("formats USD with $ symbol", () => {
    expect(formatPrice(100, "USD")).toBe("$56");
  });

  it("formats EUR with € symbol", () => {
    expect(formatPrice(100, "EUR")).toBe("€52");
  });

  it("rounds to nearest integer", () => {
    expect(formatPrice(99, "USD")).toBe("$55"); // 99 × 0.56 = 55.44 → 55
  });

  it("uses $ for unknown currency", () => {
    expect(formatPrice(50, "XYZ")).toBe("$50");
  });
});

describe("getCurrencySymbol", () => {
  it("returns $ for NZD and USD", () => {
    expect(getCurrencySymbol("NZD")).toBe("$");
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns $ for unknown currency", () => {
    expect(getCurrencySymbol("GBP")).toBe("$");
  });
});
