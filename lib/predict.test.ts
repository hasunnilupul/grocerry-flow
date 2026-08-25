import { describe, expect, it } from "vitest";
import {
  describeReason,
  median,
  predictNextMonth,
  roundQuantity,
  type ItemHistory,
} from "./predict";

describe("median", () => {
  it("takes the middle of an odd-length series", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("averages the middle pair of an even-length series", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("is unmoved by a single outlier month", () => {
    // The point of using a median: one 20 kg stock-up must not drag the
    // usual 5 kg prediction upward.
    expect(median([5, 5, 5, 20])).toBe(5);
  });

  it("returns zero for nothing", () => {
    expect(median([])).toBe(0);
  });
});

describe("roundQuantity", () => {
  it("rounds countable units to whole numbers", () => {
    expect(roundQuantity(2.4, "pcs")).toBe(2);
    expect(roundQuantity(2.6, "pcs")).toBe(3);
    expect(roundQuantity(1.5, "pack")).toBe(2);
  });

  it("never predicts zero of a countable item", () => {
    expect(roundQuantity(0.2, "pcs")).toBe(1);
  });

  it("keeps two decimals for weighed and measured units", () => {
    expect(roundQuantity(1.755, "kg")).toBe(1.76);
    expect(roundQuantity(0.333, "L")).toBe(0.33);
  });

  it("never predicts zero of a weighed item", () => {
    expect(roundQuantity(0, "kg")).toBe(0.01);
  });
});

describe("describeReason", () => {
  it("calls out an every-month item", () => {
    expect(describeReason(6, 6, 1)).toBe("Bought every month");
  });

  it("explains a gap for an overdue item", () => {
    expect(describeReason(2, 6, 3)).toBe("Due — last bought 3 months ago");
  });

  it("gives the ratio otherwise", () => {
    expect(describeReason(4, 6, 1)).toBe("Bought 4 of the last 6 months");
  });
});

const history = (over: Partial<ItemHistory> = {}): ItemHistory => ({
  itemId: "i1",
  name: "Rice",
  unit: "kg",
  monthlyQuantities: [
    { month: "2026-06", quantity: 5 },
    { month: "2026-07", quantity: 5 },
    { month: "2026-08", quantity: 5 },
  ],
  ...over,
});

describe("predictNextMonth", () => {
  it("predicts the usual quantity for a monthly item", () => {
    const [prediction] = predictNextMonth([history()], "2026-09", 3);

    expect(prediction).toMatchObject({
      name: "Rice",
      quantity: 5,
      unit: "kg",
      monthsSeen: 3,
      confidence: 1,
      reason: "Bought every month",
    });
  });

  it("uses the median so a stock-up month doesn't inflate the list", () => {
    const [prediction] = predictNextMonth(
      [
        history({
          monthlyQuantities: [
            { month: "2026-06", quantity: 5 },
            { month: "2026-07", quantity: 5 },
            { month: "2026-08", quantity: 25 },
          ],
        }),
      ],
      "2026-09",
      3,
    );

    expect(prediction.quantity).toBe(5);
  });

  it("leaves out a one-off purchase", () => {
    const predictions = predictNextMonth(
      [history({ monthlyQuantities: [{ month: "2026-06", quantity: 1 }] })],
      "2026-09",
      6,
    );

    expect(predictions).toEqual([]);
  });

  it("leaves out an item that isn't due yet", () => {
    // Bought 2 of 6 months, so roughly quarterly; last bought last month.
    const predictions = predictNextMonth(
      [
        history({
          monthlyQuantities: [
            { month: "2026-05", quantity: 1 },
            { month: "2026-08", quantity: 1 },
          ],
        }),
      ],
      "2026-09",
      6,
    );

    expect(predictions).toEqual([]);
  });

  it("includes a quarterly item once it comes due", () => {
    const predictions = predictNextMonth(
      [
        history({
          name: "Tea",
          unit: "pack",
          monthlyQuantities: [
            { month: "2026-03", quantity: 1 },
            { month: "2026-06", quantity: 1 },
          ],
        }),
      ],
      "2026-09",
      6,
    );

    expect(predictions).toHaveLength(1);
    expect(predictions[0].reason).toBe("Due — last bought 3 months ago");
  });

  it("falls back to repeating the only month on record", () => {
    const predictions = predictNextMonth(
      [history({ monthlyQuantities: [{ month: "2026-08", quantity: 5 }] })],
      "2026-09",
      1,
    );

    expect(predictions).toHaveLength(1);
    expect(predictions[0]).toMatchObject({
      quantity: 5,
      confidence: 0.5,
      reason: "Bought last month",
    });
  });

  it("orders the most dependable items first", () => {
    const predictions = predictNextMonth(
      [
        history({
          itemId: "a",
          name: "Sometimes",
          monthlyQuantities: [
            { month: "2026-04", quantity: 1 },
            { month: "2026-08", quantity: 1 },
          ],
        }),
        history({ itemId: "b", name: "Always" }),
      ],
      "2026-09",
      3,
    );

    expect(predictions[0].name).toBe("Always");
  });

  it("breaks ties alphabetically so the list doesn't shuffle", () => {
    const predictions = predictNextMonth(
      [
        history({ itemId: "b", name: "Zucchini" }),
        history({ itemId: "a", name: "Apples" }),
      ],
      "2026-09",
      3,
    );

    expect(predictions.map((p) => p.name)).toEqual(["Apples", "Zucchini"]);
  });

  it("counts eggs in whole pieces", () => {
    const [prediction] = predictNextMonth(
      [
        history({
          name: "Eggs",
          unit: "pcs",
          monthlyQuantities: [
            { month: "2026-06", quantity: 30 },
            { month: "2026-07", quantity: 25 },
            { month: "2026-08", quantity: 30 },
          ],
        }),
      ],
      "2026-09",
      3,
    );

    expect(prediction.quantity).toBe(30);
    expect(Number.isInteger(prediction.quantity)).toBe(true);
  });

  it("returns nothing when there is no history at all", () => {
    expect(predictNextMonth([], "2026-09", 6)).toEqual([]);
    expect(predictNextMonth([history()], "2026-09", 0)).toEqual([]);
  });

  it("skips items with no recorded months", () => {
    expect(
      predictNextMonth([history({ monthlyQuantities: [] })], "2026-09", 6),
    ).toEqual([]);
  });
});
