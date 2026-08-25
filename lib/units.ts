/** Units a grocery item can be bought in. Kept small on purpose — a long list
 *  slows down entry, which is the thing this app has to be good at. */
export const UNITS = ["pcs", "pack", "kg", "g", "L", "ml", "bunch"] as const;

export type Unit = (typeof UNITS)[number];

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value);
}

/** Units that measure the same physical dimension can be summed together
 *  after converting to the base unit. */
const BASE_UNIT: Record<Unit, Unit> = {
  pcs: "pcs",
  pack: "pack",
  kg: "kg",
  g: "kg",
  L: "L",
  ml: "L",
  bunch: "bunch",
};

const TO_BASE_FACTOR: Record<Unit, number> = {
  pcs: 1,
  pack: 1,
  kg: 1,
  g: 0.001,
  L: 1,
  ml: 0.001,
  bunch: 1,
};

export function baseUnit(unit: Unit): Unit {
  return BASE_UNIT[unit];
}

/** Convert a quantity to its base unit, so `500 g` and `1 kg` can be added up. */
export function toBaseQuantity(quantity: number, unit: Unit): number {
  return quantity * TO_BASE_FACTOR[unit];
}

/** Convert a base-unit quantity back into `unit`. */
export function fromBaseQuantity(baseQuantity: number, unit: Unit): number {
  return baseQuantity / TO_BASE_FACTOR[unit];
}

/** Trim trailing zeros so quantities read like `1.5 kg`, not `1.500 kg`. */
export function formatQuantity(quantity: number, unit: Unit): string {
  const rounded = Math.round(quantity * 1000) / 1000;
  return `${rounded} ${unit}`;
}
