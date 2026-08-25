import { describe, expect, it } from "vitest";
import {
  baseUnit,
  formatQuantity,
  fromBaseQuantity,
  isUnit,
  toBaseQuantity,
  UNITS,
} from "./units";

describe("isUnit", () => {
  it("accepts every unit the app offers", () => {
    for (const unit of UNITS) {
      expect(isUnit(unit)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isUnit("gallons")).toBe(false);
    expect(isUnit("")).toBe(false);
  });
});

describe("baseUnit", () => {
  it("folds mass units together", () => {
    expect(baseUnit("g")).toBe("kg");
    expect(baseUnit("kg")).toBe("kg");
  });

  it("folds volume units together", () => {
    expect(baseUnit("ml")).toBe("L");
    expect(baseUnit("L")).toBe("L");
  });

  it("leaves countable units alone", () => {
    expect(baseUnit("pcs")).toBe("pcs");
    expect(baseUnit("pack")).toBe("pack");
  });
});

describe("quantity conversion", () => {
  it("converts grams to kilograms", () => {
    expect(toBaseQuantity(500, "g")).toBeCloseTo(0.5);
  });

  it("converts millilitres to litres", () => {
    expect(toBaseQuantity(250, "ml")).toBeCloseTo(0.25);
  });

  it("leaves base units untouched", () => {
    expect(toBaseQuantity(3, "kg")).toBe(3);
    expect(toBaseQuantity(3, "pcs")).toBe(3);
  });

  it("round-trips back to the original unit", () => {
    expect(fromBaseQuantity(toBaseQuantity(750, "g"), "g")).toBeCloseTo(750);
  });

  it("lets mixed mass entries be summed", () => {
    // 1 kg + 500 g should read as 1.5 kg, which is the whole point of the base unit.
    const total = toBaseQuantity(1, "kg") + toBaseQuantity(500, "g");
    expect(total).toBeCloseTo(1.5);
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros", () => {
    expect(formatQuantity(1.5, "kg")).toBe("1.5 kg");
    expect(formatQuantity(2, "pcs")).toBe("2 pcs");
  });

  it("rounds off floating-point noise", () => {
    expect(formatQuantity(0.1 + 0.2, "L")).toBe("0.3 L");
  });
});
