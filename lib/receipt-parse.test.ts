import { describe, expect, it } from "vitest";
import {
  extractDateGuess,
  extractStoreGuess,
  parseReceiptText,
} from "./receipt-parse";

/** A trimmed-down stand-in for what OCR returns for the receipt this was
 *  built against: header block, column header, item rows, the discounts
 *  section, and the totals footer. */
const RECEIPT = `
Bill Date : 11-Sep-2026
Billed Time : 21:59:32
Billed Store : Keells - Thihariya
Bill No : 3361037
Your bill for this transaction: 37,133.46
 #   Item     Description                  Qty     Price     Amount
 1   118281   KEELLS BAR SOAP 650G         1.0     445.00    445.00
 6   128252   EH I/C WONDER BAR 70ML       2.0     120.00    240.00
 19  10679    RICE SUPIRI KEERI BULK KG    3.008   260.00    782.08
 46  923004   BANANA - AMBUN               0.610   700.00    427.00
 56  924007   APPLE - RED                  0.324   3,300.00  1,069.20
 63  R1234    KEELLS BAG 16 X 18 RE-USE.   2.0     0.01      0.02
 64  E1234    KEELLS BAG 16 X 18 REFUND    -2.0    0.01      -0.02
Discounts
Nexus Deals 25%
 9   112575   25.00% Dis                             Rs: 280.00
You earned a Green Discount of
 63  R1234    Value Dis                              Rs: 12.00
Total Gross Amount                                   38,180.46
Total Net Amount                                     37,133.46
Credit Card                                          37,133.46
`;

describe("parseReceiptText", () => {
  it("reads name, quantity and line total from item rows", () => {
    const { rows } = parseReceiptText(RECEIPT);

    expect(rows[0]).toEqual({
      name: "KEELLS BAR SOAP 650G",
      quantity: 1,
      unit: "pcs",
      totalPrice: 445,
    });
    expect(rows[1]).toEqual({
      name: "EH I/C WONDER BAR 70ML",
      quantity: 2,
      unit: "pcs",
      totalPrice: 240,
    });
  });

  it("treats a fractional quantity as a weight in kg", () => {
    const { rows } = parseReceiptText(RECEIPT);
    const byName = new Map(rows.map((row) => [row.name, row]));

    expect(byName.get("RICE SUPIRI KEERI BULK KG")).toMatchObject({
      quantity: 3.008,
      unit: "kg",
    });
    expect(byName.get("BANANA - AMBUN")).toMatchObject({
      quantity: 0.61,
      unit: "kg",
    });
  });

  it("reads amounts written with thousands separators", () => {
    const { rows } = parseReceiptText(RECEIPT);
    const apple = rows.find((row) => row.name === "APPLE - RED");

    expect(apple).toMatchObject({ quantity: 0.324, totalPrice: 1069.2 });
  });

  it("skips headers, the discounts section and the totals footer", () => {
    const { rows } = parseReceiptText(RECEIPT);

    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.name)).not.toContain("Description");
    for (const row of rows) {
      expect(row.name).not.toMatch(/Dis$|Total|Credit Card|Bill/);
    }
  });

  it("skips a totals line on structure alone, without a keyword match", () => {
    const { rows } = parseReceiptText(
      "Grand Sum Payable Today Gross    38,180.46",
    );
    expect(rows).toEqual([]);
  });

  it("skips a header line whose value ends in digit groups", () => {
    // Seen on a real bill: the trailing numbers are shaped exactly like a
    // qty/price/amount triplet, so only the label's colon rules it out.
    expect(
      parseReceiptText("Store Mobile : 0771 073 281 / 0112 303 500").rows,
    ).toEqual([]);
    expect(
      parseReceiptText("Store Mobile: 0771 073 281 / 0112 303 500").rows,
    ).toEqual([]);
  });

  it("keeps a refund row so the reviewer can see and remove it", () => {
    const { rows } = parseReceiptText(RECEIPT);
    const refund = rows.find((row) => row.name.endsWith("REFUND"));

    // The price is dropped rather than recorded as negative; the negative
    // quantity is what the review form makes the user resolve.
    expect(refund).toMatchObject({ quantity: -2, totalPrice: null });
  });

  it("drops OCR litter from the end of a name but keeps punctuation inside it", () => {
    const { rows } = parseReceiptText(
      [
        " 5   118628   KELLOGG'S MUESLI FRUIT AND NUT ~~   1.0   3,150.00   3,150.00",
        " 46  923004   BANANA - AMBUN                      0.610 700.00     427.00",
      ].join("\n"),
    );

    expect(rows.map((row) => row.name)).toEqual([
      "KELLOGG'S MUESLI FRUIT AND NUT",
      "BANANA - AMBUN",
    ]);
  });

  it("tolerates ragged spacing as long as the trailing numbers are intact", () => {
    const { rows } = parseReceiptText(
      "  7    128424    LUX  BODY   WASH  POUCH 125ML    1.0   250.00   250.00  ",
    );

    expect(rows).toEqual([
      {
        name: "LUX BODY WASH POUCH 125ML",
        quantity: 1,
        unit: "pcs",
        totalPrice: 250,
      },
    ]);
  });

  it("returns nothing for text that holds no item rows", () => {
    expect(parseReceiptText("thanks for shopping with us").rows).toEqual([]);
    expect(parseReceiptText("").rows).toEqual([]);
  });
});

describe("extractDateGuess", () => {
  it("reads a labelled bill date", () => {
    expect(extractDateGuess(RECEIPT)).toBe("2026-09-11");
    expect(extractDateGuess("Bill Date : 3-Mar-2026")).toBe("2026-03-03");
  });

  it("returns null when there is no date it can trust", () => {
    expect(extractDateGuess("Bill Date : sometime last week")).toBeNull();
    expect(extractDateGuess("KEELLS BAR SOAP 650G")).toBeNull();
  });
});

describe("extractStoreGuess", () => {
  it("reads a labelled store", () => {
    expect(extractStoreGuess(RECEIPT)).toBe("Keells - Thihariya");
  });

  it("returns null when the receipt doesn't name a store", () => {
    expect(extractStoreGuess("KEELLS BAR SOAP 650G")).toBeNull();
  });
});
