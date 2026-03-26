import { supabase } from "@/integrations/supabase/client";

// Fallback rates used while live rates load or if fetch fails
let exchangeRates: Record<string, number> = {
  NZD: 1,
  USD: 0.56,
  EUR: 0.52,
};

let lastFetchedAt = 0;
let fetchPromise: Promise<void> | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchLiveRates(): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('exchange-rates');
    if (error) throw error;
    if (data?.rates) {
      exchangeRates = data.rates;
      lastFetchedAt = Date.now();
    }
  } catch (e) {
    console.warn('Failed to fetch live exchange rates, using cached/fallback rates', e);
  } finally {
    fetchPromise = null;
  }
}

/** Ensure rates are fresh. Call early (e.g. on app mount). */
export function refreshRatesIfNeeded(): void {
  if (Date.now() - lastFetchedAt > CACHE_TTL && !fetchPromise) {
    fetchPromise = fetchLiveRates();
  }
}

// Kick off an initial fetch immediately on import
refreshRatesIfNeeded();

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: "$",
  USD: "$",
  EUR: "€",
};

/** Convert a price stored in NZD to the target currency */
export function convertPrice(priceNzd: number, toCurrency: string): number {
  const rate = exchangeRates[toCurrency] ?? 1;
  return priceNzd * rate;
}

/** Format a price (stored in NZD) into the user's preferred currency */
export function formatPrice(priceNzd: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
  const converted = convertPrice(priceNzd, currency);
  return `${symbol}${converted.toFixed(0)}`;
}

/** Get just the symbol for a currency code */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? "$";
}
