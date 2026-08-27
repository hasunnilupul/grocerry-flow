import { describe, expect, it } from "vitest";
import { estimatePrice, type LastPurchase } from "./pricing";

const last = (over: Partial<LastPurchase> = {}): LastPurchase => ({
  quantity: 5,
  unit: "kg",
  totalPrice: 1250,
  ...over,
});

describe("estimatePrice", () => {
  it("returns exactly what was paid when the shop is the same", () => {
    expect(estimatePrice(last(), 5, "kg")).toBe(1250);
  });

  it("scales down for a smaller quantity", () => {
    // 5 kg cost 1250, so 2 kg is 500 — not another 1250.
    expect(estimatePrice(last(), 2, "kg")).toBe(500);
  });

  it("scales up for a larger quantity", () => {
    expect(estimatePrice(last(), 10, "kg")).toBe(2500);
  });

  it("converts between compatible units", () => {
    // 1250 per 5 kg is 0.25 per gram.
    expect(estimatePrice(last(), 500, "g")).toBe(125);
    expect(estimatePrice(last({ quantity: 500, unit: "g", totalPrice: 125 }), 5, "kg")).toBe(
      1250,
    );
  });

  it("handles volume the same way", () => {
    expect(
      estimatePrice(last({ quantity: 2, unit: "L", totalPrice: 480 }), 250, "ml"),
    ).toBe(60);
  });

  it("refuses to compare measures that cannot be compared", () => {
    // A price per kilo says nothing about a price per piece.
    expect(estimatePrice(last(), 3, "pcs")).toBeNull();
    expect(estimatePrice(last({ unit: "pcs", quantity: 6, totalPrice: 300 }), 1, "kg")).toBeNull();
  });

  it("has nothing to suggest without a previous purchase", () => {
    expect(estimatePrice(null, 5, "kg")).toBeNull();
    expect(estimatePrice(undefined, 5, "kg")).toBeNull();
  });

  it("ignores a nonsensical previous purchase", () => {
    expect(estimatePrice(last({ quantity: 0 }), 5, "kg")).toBeNull();
    expect(estimatePrice(last({ totalPrice: -10 }), 5, "kg")).toBeNull();
    expect(estimatePrice(last({ quantity: -1 }), 5, "kg")).toBeNull();
  });

  it("carries a free item through as free, not as unknown", () => {
    expect(estimatePrice(last({ totalPrice: 0 }), 5, "kg")).toBe(0);
  });

  it("rounds to cents", () => {
    // 1000 per 3 kg is 333.333… per kg.
    expect(estimatePrice(last({ quantity: 3, totalPrice: 1000 }), 1, "kg")).toBe(
      333.33,
    );
  });

  it("counts pieces without converting them", () => {
    expect(
      estimatePrice(last({ quantity: 30, unit: "pcs", totalPrice: 1500 }), 10, "pcs"),
    ).toBe(500);
  });
});
