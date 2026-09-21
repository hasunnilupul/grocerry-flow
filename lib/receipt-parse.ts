import { cleanItemName } from "./items";
import { parseMoney } from "./money";
import type { Unit } from "./units";

/** Turns OCR'd receipt text into trip row candidates. Deliberately
 *  best-effort: a human reviews every row before it's saved (see
 *  ImportReceiptForm), so this only needs to beat retyping, not be exact. */

export type ReceiptRowCandidate = {
  name: string;
  // Can be negative for a refund/return line (e.g. a returned reusable bag).
  // Left as-is rather than dropped — the review form's quantity field
  // already refuses to submit a negative value, which is the guard that
  // actually matters, so don't "fix" this by filtering here too.
  quantity: number;
  unit: Unit;
  totalPrice: number | null;
};

export type ReceiptParseResult = {
  rows: ReceiptRowCandidate[];
  // Both null unless the receipt happens to carry an explicit label for it
  // (e.g. "Billed Store :", "Bill Date :"). Most receipts won't, and that's
  // fine — the caller falls back to today's date and a blank store, same as
  // starting a trip by hand.
  store: string | null;
  shoppedAt: string | null;
};

// A qty/price/amount token: digits with optional thousands commas and a
// decimal part, optionally negative (a refund line's quantity or amount).
const NUMERIC_TOKEN = /^-?[\d,]+(?:\.\d+)?$/;

// An item number or product code ("1", "118281", "R1234"): rows lead with
// one or two of these before the description starts.
const CODE_TOKEN = /^[A-Z]?\d+$/;

const SKIP_PREFIXES = [
  "bill date",
  "billed store",
  "discounts",
  "total gross amount",
  "total net amount",
  "credit card",
  "cash",
];

function isSkippableLine(line: string): boolean {
  const lower = line.toLowerCase();
  return SKIP_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Like `parseMoney`, but keeps a leading "-" instead of rejecting it, so a
 *  refund row's negative quantity survives instead of being silently
 *  dropped. Only used for the quantity token, never for a displayed price. */
function parseSignedNumber(token: string): number | null {
  const cleaned = token.replace(/,/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** A line only counts as an item row if its last three tokens are all
 *  numeric (qty, unit price, amount). That single structural check is what
 *  filters out the column header, totals, and the discounts section without
 *  knowing anything about a particular store's receipt layout — so it holds
 *  up on receipts this app has never seen, not just the one it was built
 *  against. */
function parseLine(line: string): ReceiptRowCandidate | null {
  if (isSkippableLine(line)) return null;

  const tokens = line.split(/\s+/);
  if (tokens.length < 5) return null;

  const last = tokens.length - 1;
  const [qtyToken, priceToken, amountToken] = [
    tokens[last - 2],
    tokens[last - 1],
    tokens[last],
  ];
  if (
    !NUMERIC_TOKEN.test(qtyToken) ||
    !NUMERIC_TOKEN.test(priceToken) ||
    !NUMERIC_TOKEN.test(amountToken)
  ) {
    return null;
  }

  const quantity = parseSignedNumber(qtyToken);
  if (quantity === null || quantity === 0) return null;

  const nameTokens = tokens.slice(0, last - 2);

  // A "Label : value" line out of the receipt's header block. A long enough
  // value — a phone number, a bill or loyalty number — ends in three groups
  // of digits, which is indistinguishable from qty/price/amount by shape
  // alone. The colon is what gives it away, and item descriptions don't
  // carry one.
  if (nameTokens.some((token) => token.endsWith(":"))) return null;

  // Drop up to two leading item-code-like tokens, but always leave at least
  // one token behind for the name itself.
  let skip = 0;
  while (
    skip < 2 &&
    skip < nameTokens.length - 1 &&
    CODE_TOKEN.test(nameTokens[skip])
  ) {
    skip++;
  }

  // Trailing tokens with nothing readable in them are OCR picking up the
  // ruled line or the wrapped end of a description ("MUESLI FRUIT ~~").
  // Punctuation inside a name is left alone, so "BANANA - AMBUN" keeps its
  // dash.
  const named = nameTokens.slice(skip);
  while (named.length > 1 && !/[a-z0-9]/i.test(named[named.length - 1])) {
    named.pop();
  }

  const name = cleanItemName(named.join(" "));
  if (!name) return null;

  const unit: Unit = Number.isInteger(Math.abs(quantity)) ? "pcs" : "kg";

  return { name, quantity, unit, totalPrice: parseMoney(amountToken) };
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Best-effort read of a "Bill Date : 11-Sep-2026" style line. Returns null
 *  on anything it can't confidently parse rather than guessing. */
export function extractDateGuess(text: string): string | null {
  const match = text.match(
    /bill(?:ed)?\s*date\s*:?\s*(\d{1,2})[-\s](\w{3,})[-\s](\d{4})/i,
  );
  if (!match) return null;

  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  if (!month) return null;

  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

/** Best-effort read of a "Billed Store : Keells - Thihariya" style line. */
export function extractStoreGuess(text: string): string | null {
  const match = text.match(/billed\s*store\s*:?\s*([^\r\n]+)/i);
  if (!match) return null;

  const store = match[1].trim().replace(/\s+/g, " ").slice(0, 80);
  return store || null;
}

export function parseReceiptText(text: string): ReceiptParseResult {
  const rows: ReceiptRowCandidate[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const row = parseLine(line);
    if (row) rows.push(row);
  }

  return {
    rows,
    store: extractStoreGuess(text),
    shoppedAt: extractDateGuess(text),
  };
}
