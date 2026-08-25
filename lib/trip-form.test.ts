import { describe, expect, it } from "vitest";
import {
  mergeDuplicateRows,
  parseTripForm,
  tripTotal,
  type ParsedRow,
} from "./trip-form";

type RowInput = {
  name: string;
  quantity?: string;
  unit?: string;
  price?: string;
};

function buildForm(
  rows: RowInput[],
  fields: { shoppedAt?: string; store?: string } = {},
): FormData {
  const formData = new FormData();
  formData.set("shoppedAt", fields.shoppedAt ?? "2026-08-25");
  if (fields.store !== undefined) formData.set("store", fields.store);

  for (const row of rows) {
    formData.append("itemName", row.name);
    formData.append("quantity", row.quantity ?? "1");
    formData.append("unit", row.unit ?? "pcs");
    formData.append("price", row.price ?? "");
  }
  return formData;
}

describe("parseTripForm", () => {
  it("parses a straightforward trip", () => {
    const result = parseTripForm(
      buildForm(
        [
          { name: "Rice", quantity: "5", unit: "kg", price: "1250" },
          { name: "Milk", quantity: "2", unit: "L", price: "480.50" },
        ],
        { store: "Keells" },
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.trip.shoppedAt).toBe("2026-08-25");
    expect(result.trip.store).toBe("Keells");
    expect(result.trip.rows).toEqual([
      { name: "Rice", quantity: 5, unit: "kg", totalPrice: 1250 },
      { name: "Milk", quantity: 2, unit: "L", totalPrice: 480.5 },
    ]);
  });

  it("skips blank rows left behind in the form", () => {
    const result = parseTripForm(
      buildForm([{ name: "Rice" }, { name: "  " }, { name: "Eggs" }]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trip.rows.map((row) => row.name)).toEqual(["Rice", "Eggs"]);
  });

  it("treats a missing store as no store", () => {
    const result = parseTripForm(buildForm([{ name: "Rice" }], { store: "  " }));
    expect(result.ok && result.trip.store).toBeNull();
  });

  it("keeps a price of zero distinct from no price", () => {
    const result = parseTripForm(
      buildForm([
        { name: "Free sample", price: "0" },
        { name: "Rice", price: "" },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trip.rows[0].totalPrice).toBe(0);
    expect(result.trip.rows[1].totalPrice).toBeNull();
  });

  it("rejects a trip with no items at all", () => {
    const result = parseTripForm(buildForm([{ name: "" }]));
    expect(result).toEqual({
      ok: false,
      error: "Add at least one item before saving.",
    });
  });

  it("rejects a zero or negative quantity, naming the item", () => {
    expect(parseTripForm(buildForm([{ name: "Rice", quantity: "0" }]))).toEqual({
      ok: false,
      error: '"Rice" needs a quantity above zero.',
    });
    expect(parseTripForm(buildForm([{ name: "Rice", quantity: "-2" }]))).toEqual(
      { ok: false, error: '"Rice" needs a quantity above zero.' },
    );
  });

  it("rejects a non-numeric quantity", () => {
    const result = parseTripForm(buildForm([{ name: "Rice", quantity: "lots" }]));
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown unit", () => {
    expect(parseTripForm(buildForm([{ name: "Rice", unit: "sacks" }]))).toEqual({
      ok: false,
      error: '"Rice" has an unknown unit.',
    });
  });

  it("rejects a malformed or impossible date", () => {
    expect(
      parseTripForm(buildForm([{ name: "Rice" }], { shoppedAt: "25-08-2026" })),
    ).toEqual({ ok: false, error: "Pick a valid date for the trip." });

    expect(
      parseTripForm(buildForm([{ name: "Rice" }], { shoppedAt: "2026-02-31" })),
    ).toEqual({ ok: false, error: "Pick a valid date for the trip." });
  });

  it("rounds quantity to the three decimals the column stores", () => {
    const result = parseTripForm(
      buildForm([{ name: "Rice", quantity: "1.23456" }]),
    );
    expect(result.ok && result.trip.rows[0].quantity).toBe(1.235);
  });
});

describe("mergeDuplicateRows", () => {
  const row = (over: Partial<ParsedRow>): ParsedRow => ({
    name: "Rice",
    quantity: 1,
    unit: "kg",
    totalPrice: null,
    ...over,
  });

  it("adds up two rows for the same item and unit", () => {
    const merged = mergeDuplicateRows([
      row({ quantity: 2, totalPrice: 500 }),
      row({ quantity: 3, totalPrice: 750 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
    expect(merged[0].totalPrice).toBe(1250);
  });

  it("matches item names case-insensitively", () => {
    const merged = mergeDuplicateRows([
      row({ name: "Rice", quantity: 1 }),
      row({ name: "rice", quantity: 2 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(3);
  });

  it("keeps different units as separate lines", () => {
    const merged = mergeDuplicateRows([
      row({ quantity: 1, unit: "kg" }),
      row({ quantity: 500, unit: "g" }),
    ]);
    expect(merged).toHaveLength(2);
  });

  it("keeps different items apart", () => {
    const merged = mergeDuplicateRows([row({ name: "Rice" }), row({ name: "Dhal" })]);
    expect(merged).toHaveLength(2);
  });

  it("does not invent a price when neither row had one", () => {
    const merged = mergeDuplicateRows([row({}), row({})]);
    expect(merged[0].totalPrice).toBeNull();
  });

  it("keeps the one price when only the second row had one", () => {
    const merged = mergeDuplicateRows([
      row({ totalPrice: null }),
      row({ totalPrice: 300 }),
    ]);
    expect(merged[0].totalPrice).toBe(300);
  });

  it("does not mutate the rows it was given", () => {
    const original = row({ quantity: 2 });
    mergeDuplicateRows([original, row({ quantity: 3 })]);
    expect(original.quantity).toBe(2);
  });
});

describe("tripTotal", () => {
  const priced = (totalPrice: number | null): ParsedRow => ({
    name: "x",
    quantity: 1,
    unit: "pcs",
    totalPrice,
  });

  it("adds the priced lines", () => {
    expect(tripTotal([priced(10.5), priced(4.25)])).toBe(14.75);
  });

  it("ignores unpriced lines", () => {
    expect(tripTotal([priced(10), priced(null)])).toBe(10);
  });

  it("returns null when nothing was priced", () => {
    expect(tripTotal([priced(null), priced(null)])).toBeNull();
  });
});
