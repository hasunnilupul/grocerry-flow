import { describe, expect, it } from "vitest";
import {
  averageSpend,
  chartCeiling,
  foldItemQuantities,
  percentChange,
  type MonthTotal,
  type PurchaseRow,
} from "./summary";

const row = (over: Partial<PurchaseRow> = {}): PurchaseRow => ({
  name: "Rice",
  unit: "kg",
  quantity: 1,
  total: 100,
  ...over,
});

describe("foldItemQuantities", () => {
  it("sums quantity and spend for one item", () => {
    const [item] = foldItemQuantities([
      row({ quantity: 2, total: 200 }),
      row({ quantity: 3, total: 300 }),
    ]);

    expect(item.quantities).toEqual([{ quantity: 5, unit: "kg" }]);
    expect(item.total).toBe(500);
  });

  it("folds grams into kilograms", () => {
    const [item] = foldItemQuantities([
      row({ quantity: 1, unit: "kg", total: 200 }),
      row({ quantity: 500, unit: "g", total: 100 }),
    ]);

    expect(item.quantities).toEqual([{ quantity: 1.5, unit: "kg" }]);
    expect(item.total).toBe(300);
  });

  it("folds millilitres into litres", () => {
    const [item] = foldItemQuantities([
      row({ name: "Milk", quantity: 1, unit: "L", total: 200 }),
      row({ name: "Milk", quantity: 250, unit: "ml", total: 50 }),
    ]);

    expect(item.quantities).toEqual([{ quantity: 1.25, unit: "L" }]);
  });

  it("keeps incompatible measures as separate entries", () => {
    const [item] = foldItemQuantities([
      row({ quantity: 2, unit: "kg" }),
      row({ quantity: 3, unit: "pcs" }),
    ]);

    expect(item.quantities).toHaveLength(2);
    expect(item.quantities).toContainEqual({ quantity: 2, unit: "kg" });
    expect(item.quantities).toContainEqual({ quantity: 3, unit: "pcs" });
  });

  it("treats differently-cased names as one item", () => {
    const items = foldItemQuantities([
      row({ name: "Rice", quantity: 1 }),
      row({ name: "rice", quantity: 2 }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].quantities[0].quantity).toBe(3);
  });

  it("orders by spend, highest first", () => {
    const items = foldItemQuantities([
      row({ name: "Cheap", total: 10 }),
      row({ name: "Expensive", total: 900 }),
      row({ name: "Middling", total: 100 }),
    ]);

    expect(items.map((item) => item.name)).toEqual([
      "Expensive",
      "Middling",
      "Cheap",
    ]);
  });

  it("sorts unpriced items last, alphabetically", () => {
    const items = foldItemQuantities([
      row({ name: "Zucchini", total: null }),
      row({ name: "Apples", total: null }),
      row({ name: "Rice", total: 50 }),
    ]);

    expect(items.map((item) => item.name)).toEqual([
      "Rice",
      "Apples",
      "Zucchini",
    ]);
  });

  it("keeps an item with no prices at null spend, not zero", () => {
    const [item] = foldItemQuantities([row({ total: null }), row({ total: null })]);
    expect(item.total).toBeNull();
  });

  it("counts a partially-priced item as the sum of what was priced", () => {
    const [item] = foldItemQuantities([
      row({ total: null }),
      row({ total: 250 }),
    ]);
    expect(item.total).toBe(250);
  });

  it("returns nothing for no rows", () => {
    expect(foldItemQuantities([])).toEqual([]);
  });
});

describe("percentChange", () => {
  it("reports an increase", () => {
    expect(percentChange(150, 100)).toBe(50);
  });

  it("reports a decrease as negative", () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("rounds to one decimal", () => {
    expect(percentChange(133, 100)).toBe(33);
    expect(percentChange(100.5, 77)).toBe(30.5);
  });

  it("has nothing to say without a comparison", () => {
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(null, 100)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("chartCeiling", () => {
  it("rounds up to a clean bound above the peak", () => {
    expect(chartCeiling([120, 340, 80])).toBe(350);
    expect(chartCeiling([1200, 3400])).toBe(3500);
  });

  it("never returns a ceiling below the peak", () => {
    for (const values of [[7], [99], [1], [4321], [55555]]) {
      expect(chartCeiling(values)).toBeGreaterThanOrEqual(Math.max(...values));
    }
  });

  it("avoids dividing by zero for an all-zero series", () => {
    expect(chartCeiling([0, 0])).toBe(1);
    expect(chartCeiling([])).toBe(1);
  });
});

describe("averageSpend", () => {
  const month = (total: number | null): MonthTotal => ({
    month: "2026-01",
    total,
    tripCount: 1,
  });

  it("averages the priced months", () => {
    expect(averageSpend([month(100), month(200)])).toBe(150);
  });

  it("ignores months with no prices rather than counting them as zero", () => {
    expect(averageSpend([month(100), month(200), month(null)])).toBe(150);
  });

  it("returns null when nothing was priced", () => {
    expect(averageSpend([month(null)])).toBeNull();
    expect(averageSpend([])).toBeNull();
  });
});
