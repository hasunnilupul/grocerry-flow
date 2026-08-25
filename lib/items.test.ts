import { describe, expect, it } from "vitest";
import {
  cleanItemName,
  isValidItemName,
  matchItems,
  normalizeItemName,
} from "./items";

describe("normalizeItemName", () => {
  it("folds case and collapses whitespace", () => {
    expect(normalizeItemName("Red   Onions")).toBe("red onions");
    expect(normalizeItemName("  MILK ")).toBe("milk");
  });

  it("treats the variants two people would type as one item", () => {
    const variants = ["Red Onions", "red onions", "  red  ONIONS ", "Red Onions."];
    const normalized = new Set(variants.map(normalizeItemName));
    expect(normalized.size).toBe(1);
  });

  it("strips trailing punctuation only", () => {
    expect(normalizeItemName("milk,")).toBe("milk");
    expect(normalizeItemName("st. john's bread")).toBe("st. john's bread");
  });
});

describe("cleanItemName", () => {
  it("keeps the author's capitalisation", () => {
    expect(cleanItemName("  Red   Onions ")).toBe("Red Onions");
  });

  it("caps very long names", () => {
    expect(cleanItemName("x".repeat(200))).toHaveLength(80);
  });
});

describe("isValidItemName", () => {
  it("rejects blank and punctuation-only names", () => {
    expect(isValidItemName("   ")).toBe(false);
    expect(isValidItemName(",")).toBe(false);
  });

  it("accepts a real name", () => {
    expect(isValidItemName("Rice")).toBe(true);
  });
});

describe("matchItems", () => {
  const catalog = [
    { name: "Milk" },
    { name: "Milk Powder" },
    { name: "Coconut Milk" },
    { name: "Rice" },
  ];

  it("returns the whole list, capped, for an empty query", () => {
    expect(matchItems(catalog, "", 2)).toHaveLength(2);
  });

  it("puts an exact match first, then prefixes, then substrings", () => {
    expect(matchItems(catalog, "milk").map((item) => item.name)).toEqual([
      "Milk",
      "Milk Powder",
      "Coconut Milk",
    ]);
  });

  it("ignores case and surrounding space", () => {
    expect(matchItems(catalog, "  RICE ").map((i) => i.name)).toEqual(["Rice"]);
  });

  it("returns nothing when there is no match", () => {
    expect(matchItems(catalog, "saffron")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(matchItems(catalog, "milk", 2)).toHaveLength(2);
  });
});
