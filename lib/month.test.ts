import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonthKey,
  formatMonth,
  formatMonthShort,
  isMonthKey,
  lastNMonths,
  monthKeyOf,
  monthRange,
  nextMonthKey,
  previousMonthKey,
  todayIsoDate,
} from "./month";

describe("isMonthKey", () => {
  it("accepts well-formed keys", () => {
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  it("rejects out-of-range and malformed months", () => {
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey("not-a-month")).toBe(false);
  });
});

describe("monthKeyOf", () => {
  it("takes the month from a date or a timestamp", () => {
    expect(monthKeyOf("2026-08-25")).toBe("2026-08");
    expect(monthKeyOf("2026-08-25T14:03:00.000Z")).toBe("2026-08");
  });
});

describe("currentMonthKey", () => {
  it("zero-pads single-digit months", () => {
    expect(currentMonthKey(new Date(2026, 2, 9))).toBe("2026-03");
  });
});

describe("addMonths", () => {
  it("moves forward across a year boundary", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });

  it("moves backward across a year boundary", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("is a no-op at zero", () => {
    expect(addMonths("2026-06", 0)).toBe("2026-06");
  });

  it("does not overflow on a 31st-day month", () => {
    // A naive Date(y, m, 31) rolls March into an unexpected month; the helper
    // always builds from day 1 to avoid that.
    expect(nextMonthKey("2026-01")).toBe("2026-02");
    expect(previousMonthKey("2026-03")).toBe("2026-02");
  });
});

describe("lastNMonths", () => {
  it("returns n months ending at the given one, oldest first", () => {
    expect(lastNMonths("2026-03", 4)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });

  it("returns just the month itself for n = 1", () => {
    expect(lastNMonths("2026-03", 1)).toEqual(["2026-03"]);
  });
});

describe("monthRange", () => {
  it("ends on the 31st for a long month", () => {
    expect(monthRange("2026-01")).toEqual({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  it("ends on the 30th for a short month", () => {
    expect(monthRange("2026-04")).toEqual({
      start: "2026-04-01",
      end: "2026-04-30",
    });
  });

  it("handles February in a non-leap year", () => {
    expect(monthRange("2026-02").end).toBe("2026-02-28");
  });

  it("handles February in a leap year", () => {
    expect(monthRange("2028-02").end).toBe("2028-02-29");
  });
});

describe("formatting", () => {
  it("renders a full month name and year", () => {
    expect(formatMonth("2026-08")).toBe("August 2026");
  });

  it("renders a compact label for axes", () => {
    expect(formatMonthShort("2026-03")).toBe("Mar '26");
  });
});

describe("todayIsoDate", () => {
  it("zero-pads month and day", () => {
    expect(todayIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
