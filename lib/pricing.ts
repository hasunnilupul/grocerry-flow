import { baseUnit, toBaseQuantity, type Unit } from "./units";

/** Carrying last month's price onto next month's list, so the shopper starts
 *  from a real number instead of an empty box. */

export type LastPurchase = {
  quantity: number;
  unit: Unit;
  totalPrice: number;
};

/** What this quantity would cost at the rate paid last time.
 *
 *  Scaled by quantity rather than copied: buying 2 kg when 5 kg was bought
 *  last time should not suggest the 5 kg price. When the planned quantity and
 *  unit match the last purchase, this returns exactly what was paid.
 *
 *  Returns null when there is nothing to go on, or when the measures can't be
 *  compared — a price per kilo says nothing about a price per piece. */
export function estimatePrice(
  last: LastPurchase | null | undefined,
  quantity: number,
  unit: Unit,
): number | null {
  if (!last) return null;
  if (!Number.isFinite(last.totalPrice) || last.totalPrice < 0) return null;
  if (baseUnit(last.unit) !== baseUnit(unit)) return null;

  const lastBase = toBaseQuantity(last.quantity, last.unit);
  if (!(lastBase > 0)) return null;

  const rate = last.totalPrice / lastBase;
  const estimate = rate * toBaseQuantity(quantity, unit);
  if (!Number.isFinite(estimate)) return null;

  return Math.round(estimate * 100) / 100;
}
