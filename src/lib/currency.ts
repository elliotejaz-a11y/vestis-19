// All prices are stored in NZD. These are approximate exchange rates.
// In a production app you'd fetch live rates from an API.
const EXCHANGE_RATES: Record<string, number> = {
  NZD: 1,
  USD: 0.56,
  EUR: 0.52,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: "$",
  USD: "$",
  EUR: "€",
};

/** Convert a price stored in NZD to the target currency */
export function convertPrice(priceNzd: number, toCurrency: string): number {
  const rate = EXCHANGE_RATES[toCurrency] ?? 1;
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
