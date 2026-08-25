import type { MonthKey } from "./month";
import { baseUnit, type Unit } from "./units";

/** Predicting next month's list from what the household actually buys.
 *
 *  The rule has to be explainable — a list you can't argue with is a list you
 *  stop trusting — so every prediction carries the reason it was included.
 */

export type ItemHistory = {
  itemId: string;
  name: string;
  unit: Unit;
  /** Total bought in each month that had any purchase, oldest first. */
  monthlyQuantities: { month: MonthKey; quantity: number }[];
};

export type Prediction = {
  itemId: string;
  name: string;
  unit: Unit;
  quantity: number;
  monthsSeen: number;
  monthsConsidered: number;
  /** 0–1. How reliably this item shows up; drives the sort order. */
  confidence: number;
  reason: string;
};

/** Counts, not averages: one 20 kg month shouldn't drag the usual 5 kg up. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Whole units for things you count; two decimals for things you weigh. */
export function roundQuantity(quantity: number, unit: Unit): number {
  const countable = baseUnit(unit) === "pcs" || baseUnit(unit) === "pack" || baseUnit(unit) === "bunch";
  if (countable) return Math.max(1, Math.round(quantity));
  return Math.max(0.01, Math.round(quantity * 100) / 100);
}

function monthsBetween(from: MonthKey, to: MonthKey): number {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

export function predictNextMonth(
  histories: ItemHistory[],
  targetMonth: MonthKey,
  monthsConsidered: number,
): Prediction[] {
  if (monthsConsidered <= 0) return [];

  const predictions: Prediction[] = [];

  for (const history of histories) {
    const months = history.monthlyQuantities;
    const monthsSeen = months.length;
    if (monthsSeen === 0) continue;

    const quantities = months.map((entry) => entry.quantity);
    const quantity = roundQuantity(median(quantities), history.unit);
    const lastMonth = months[months.length - 1].month;
    const monthsSinceLast = monthsBetween(lastMonth, targetMonth);

    // With only one month on record there is no pattern to find yet, so the
    // best available guess is "the same again" — better than an empty list
    // in the household's first couple of months.
    if (monthsConsidered <= 1) {
      predictions.push({
        itemId: history.itemId,
        name: history.name,
        unit: history.unit,
        quantity,
        monthsSeen,
        monthsConsidered,
        confidence: 0.5,
        reason: "Bought last month",
      });
      continue;
    }

    // A single purchase across several months is a one-off, not a habit.
    if (monthsSeen < 2) continue;

    const frequency = monthsSeen / monthsConsidered;
    // How many months typically pass between buying this.
    const interval = monthsConsidered / monthsSeen;

    // Skip things that aren't due yet: tea bought every third month should
    // not appear on the list the other two months.
    if (monthsSinceLast < Math.floor(interval)) continue;

    predictions.push({
      itemId: history.itemId,
      name: history.name,
      unit: history.unit,
      quantity,
      monthsSeen,
      monthsConsidered,
      confidence: Math.min(1, frequency),
      reason: describeReason(monthsSeen, monthsConsidered, monthsSinceLast),
    });
  }

  // Most dependable first — that ordering is what makes the list skimmable
  // in a shop, and ties break alphabetically so it doesn't shuffle.
  return predictions.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.name.localeCompare(b.name);
  });
}

export function describeReason(
  monthsSeen: number,
  monthsConsidered: number,
  monthsSinceLast: number,
): string {
  if (monthsSeen >= monthsConsidered) return "Bought every month";
  if (monthsSinceLast > 1) {
    return `Due — last bought ${monthsSinceLast} months ago`;
  }
  return `Bought ${monthsSeen} of the last ${monthsConsidered} months`;
}
