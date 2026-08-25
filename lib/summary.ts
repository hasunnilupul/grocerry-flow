import { baseUnit, toBaseQuantity, type Unit } from "./units";

/** Aggregation shared by the month and history views. Kept free of database
 *  and server imports so it can be unit-tested and used from any component. */

export type PurchaseRow = {
  name: string;
  unit: Unit;
  quantity: number;
  total: number | null;
};

export type ItemSummary = {
  name: string;
  /** One entry per measure. An item bought in both kg and g folds into a
   *  single kg entry; one bought in kg and pcs keeps both, because adding
   *  them would be meaningless. */
  quantities: { quantity: number; unit: Unit }[];
  total: number | null;
};

export function foldItemQuantities(rows: PurchaseRow[]): ItemSummary[] {
  const byItem = new Map<
    string,
    { name: string; byUnit: Map<Unit, number>; total: number | null }
  >();

  for (const row of rows) {
    const key = row.name.toLowerCase();
    let entry = byItem.get(key);
    if (!entry) {
      entry = { name: row.name, byUnit: new Map(), total: null };
      byItem.set(key, entry);
    }

    const unit = baseUnit(row.unit);
    const converted = toBaseQuantity(row.quantity, row.unit);
    entry.byUnit.set(unit, (entry.byUnit.get(unit) ?? 0) + converted);

    if (row.total !== null) {
      entry.total = (entry.total ?? 0) + row.total;
    }
  }

  const summaries: ItemSummary[] = [...byItem.values()].map((entry) => ({
    name: entry.name,
    quantities: [...entry.byUnit.entries()].map(([unit, quantity]) => ({
      unit,
      quantity: Math.round(quantity * 1000) / 1000,
    })),
    total: entry.total === null ? null : Math.round(entry.total * 100) / 100,
  }));

  // Biggest spend first — that's what someone scanning a month wants. Items
  // with no price recorded sort last, alphabetically among themselves.
  return summaries.sort((a, b) => {
    if (a.total === null && b.total === null) return a.name.localeCompare(b.name);
    if (a.total === null) return 1;
    if (b.total === null) return -1;
    if (b.total !== a.total) return b.total - a.total;
    return a.name.localeCompare(b.name);
  });
}

export type MonthTotal = {
  month: string;
  total: number | null;
  tripCount: number;
};

/** Percentage change between two months. Null when there's nothing to compare
 *  against — no previous month, or no prices recorded in it. */
export function percentChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** The upper bound of the chart's y-axis: the largest month rounded up to a
 *  clean number, so bars never touch the top edge. */
export function chartCeiling(values: number[]): number {
  const max = Math.max(0, ...values);
  if (max === 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(max));
  // Step in halves of the magnitude (100, 150, 200…), which keeps short
  // series from being scaled against an absurdly round ceiling.
  return Math.ceil(max / (magnitude / 2)) * (magnitude / 2);
}

/** Average monthly spend across the months that actually recorded prices. */
export function averageSpend(months: MonthTotal[]): number | null {
  const priced = months.filter((month) => month.total !== null);
  if (priced.length === 0) return null;
  const sum = priced.reduce((acc, month) => acc + (month.total ?? 0), 0);
  return Math.round((sum / priced.length) * 100) / 100;
}
