/** Prices are stored as plain numbers. The currency is a display concern, set
 *  once via NEXT_PUBLIC_CURRENCY (e.g. "LKR", "USD", "EUR"). Left unset, the
 *  app shows bare amounts rather than guessing a currency for the household. */

export function currencyCode(): string | undefined {
  const code = process.env.NEXT_PUBLIC_CURRENCY?.trim().toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : undefined;
}

export function formatMoney(
  amount: number | null,
  currency: string | undefined = currencyCode(),
): string {
  if (amount === null || !Number.isFinite(amount)) return "—";

  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // An unknown code shouldn't blank out the price.
    }
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Parse a price typed into a text field. Returns null for "not recorded",
 *  which is different from zero — plenty of trips get logged without prices. */
export function parseMoney(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // A minus anywhere means it isn't a price we should guess at.
  if (trimmed.includes("-")) return null;

  // Take the first run of digits, so a currency prefix ("Rs. 340", "$12.30")
  // is ignored without its punctuation leaking into the number.
  const match = trimmed.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return null;

  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
