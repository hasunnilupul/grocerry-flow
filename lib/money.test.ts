import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("parseMoney", () => {
  it("reads a plain amount", () => {
    expect(parseMoney("250")).toBe(250);
    expect(parseMoney("250.75")).toBe(250.75);
  });

  it("treats blank as not recorded, not zero", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("   ")).toBeNull();
  });

  it("keeps an explicit zero", () => {
    expect(parseMoney("0")).toBe(0);
  });

  it("tolerates separators and currency symbols", () => {
    expect(parseMoney("1,250.50")).toBe(1250.5);
    expect(parseMoney("Rs. 340")).toBe(340);
    expect(parseMoney("$12.30")).toBe(12.3);
  });

  it("rejects negatives and nonsense", () => {
    expect(parseMoney("-5")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("rounds to cents", () => {
    expect(parseMoney("10.999")).toBe(11);
  });
});

describe("formatMoney", () => {
  it("shows a dash when nothing was recorded", () => {
    expect(formatMoney(null)).toBe("—");
  });

  it("formats a bare amount to two decimals when no currency is set", () => {
    expect(formatMoney(1250.5, undefined)).toMatch(/1,?250\.50/);
  });

  it("includes the currency when one is configured", () => {
    expect(formatMoney(20, "USD")).toMatch(/20\.00/);
    expect(formatMoney(20, "USD")).toMatch(/\$|USD/);
  });

  it("falls back to a bare amount for an unknown currency code", () => {
    expect(formatMoney(20, "ZZZZ")).toMatch(/20\.00/);
  });
});
