import { cleanItemName, isValidItemName } from "./items";
import { parseMoney } from "./money";
import { isUnit, type Unit } from "./units";

/** Parsing of the trip form lives here, apart from the server action, so the
 *  rules can be tested directly against a FormData without a database. */

export type ParsedRow = {
  name: string;
  quantity: number;
  unit: Unit;
  totalPrice: number | null;
};

export type ParsedTrip = {
  shoppedAt: string;
  store: string | null;
  rows: ParsedRow[];
};

export type ParseResult =
  | { ok: true; trip: ParsedTrip }
  | { ok: false; error: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseTripForm(formData: FormData): ParseResult {
  const shoppedAt = String(formData.get("shoppedAt") ?? "").trim();
  if (!isRealDate(shoppedAt)) {
    return { ok: false, error: "Pick a valid date for the trip." };
  }

  const storeRaw = String(formData.get("store") ?? "").trim();
  const store = storeRaw ? storeRaw.slice(0, 80) : null;

  // Row fields arrive as parallel arrays — one entry per row, in order.
  const names = formData.getAll("itemName").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const units = formData.getAll("unit").map(String);
  const prices = formData.getAll("price").map(String);

  const rows: ParsedRow[] = [];

  for (let index = 0; index < names.length; index++) {
    const rawName = names[index] ?? "";

    // Blank rows are how the form starts and how people leave spare rows
    // behind. Skipping them beats making the user tidy up before saving.
    if (!rawName.trim()) continue;

    if (!isValidItemName(rawName)) {
      return { ok: false, error: `Row ${index + 1} needs a real item name.` };
    }

    const quantity = Number(String(quantities[index] ?? "").trim());
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        ok: false,
        error: `"${cleanItemName(rawName)}" needs a quantity above zero.`,
      };
    }

    const unit = String(units[index] ?? "").trim();
    if (!isUnit(unit)) {
      return {
        ok: false,
        error: `"${cleanItemName(rawName)}" has an unknown unit.`,
      };
    }

    rows.push({
      name: cleanItemName(rawName),
      // Three decimals matches the numeric(12,3) column.
      quantity: Math.round(quantity * 1000) / 1000,
      unit,
      totalPrice: parseMoney(String(prices[index] ?? "")),
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "Add at least one item before saving." };
  }

  return { ok: true, trip: { shoppedAt, store, rows } };
}

/** Two rows for the same item in one trip (a second carton spotted later)
 *  collapse into one line, so the trip doesn't violate a per-item unique key
 *  and the month's quantity stays right. Only rows sharing a unit merge;
 *  1 kg and 500 g stay separate lines and are reconciled at report time. */
export function mergeDuplicateRows(rows: ParsedRow[]): ParsedRow[] {
  const merged: ParsedRow[] = [];
  const seen = new Map<string, ParsedRow>();

  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.unit}`;
    const existing = seen.get(key);

    if (!existing) {
      const copy = { ...row };
      seen.set(key, copy);
      merged.push(copy);
      continue;
    }

    existing.quantity = Math.round((existing.quantity + row.quantity) * 1000) / 1000;
    if (row.totalPrice !== null) {
      existing.totalPrice = (existing.totalPrice ?? 0) + row.totalPrice;
    }
  }

  return merged;
}

/** What the trip cost, counting only lines that had a price entered. */
export function tripTotal(rows: ParsedRow[]): number | null {
  const priced = rows.filter((row) => row.totalPrice !== null);
  if (priced.length === 0) return null;
  return (
    Math.round(priced.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0) * 100) / 100
  );
}
