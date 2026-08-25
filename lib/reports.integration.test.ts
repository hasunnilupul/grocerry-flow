// @vitest-environment node

/** Report queries against a real Postgres. Opt-in via TEST_DATABASE_URL —
 *  see lib/trips.integration.test.ts for the container command. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const TEST_URL = process.env.TEST_DATABASE_URL;
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

describe.skipIf(!TEST_URL)("month reports", () => {
  let db: typeof import("./db");
  let trips: typeof import("./trips");
  let reports: typeof import("./reports");

  beforeAll(async () => {
    db = await import("./db");
    trips = await import("./trips");
    reports = await import("./reports");

    const schema = await readFile(
      fileURLToPath(new URL("./schema.sql", import.meta.url)),
      "utf8",
    );
    await db.getSql().unsafe(schema);
  });

  beforeEach(async () => {
    await db
      .getSql()
      .unsafe(
        "truncate plan_items, plans, purchases, trips, items restart identity cascade",
      );
  });

  afterAll(async () => {
    await db.getSql().end();
  });

  type Row = { name: string; quantity: number; unit: string; totalPrice: number | null };

  const save = (shoppedAt: string, rows: Row[], store: string | null = null) =>
    trips.saveTrip({ shoppedAt, store, rows: rows as never }, "Tester");

  it("totals only the month asked for", async () => {
    await save("2026-07-31", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: 500 }]);
    await save("2026-08-01", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: 300 }]);
    await save("2026-08-31", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: 200 }]);
    await save("2026-09-01", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: 999 }]);

    const august = await reports.getMonthReport("2026-08");
    expect(august.total).toBe(500);
    expect(august.tripCount).toBe(2);
  });

  it("includes both boundary days of the month", async () => {
    await save("2026-02-01", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 10 }]);
    await save("2026-02-28", [{ name: "B", quantity: 1, unit: "pcs", totalPrice: 20 }]);

    const february = await reports.getMonthReport("2026-02");
    expect(february.tripCount).toBe(2);
    expect(february.total).toBe(30);
  });

  it("folds mixed mass units into one line per item", async () => {
    await save("2026-08-02", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: 200 }]);
    await save("2026-08-09", [{ name: "Rice", quantity: 500, unit: "g", totalPrice: 100 }]);

    const report = await reports.getMonthReport("2026-08");
    expect(report.items).toHaveLength(1);
    expect(report.items[0].quantities).toEqual([{ quantity: 1.5, unit: "kg" }]);
    expect(report.items[0].total).toBe(300);
  });

  it("orders items by spend", async () => {
    await save("2026-08-02", [
      { name: "Cheap", quantity: 1, unit: "pcs", totalPrice: 10 },
      { name: "Dear", quantity: 1, unit: "pcs", totalPrice: 900 },
    ]);

    const report = await reports.getMonthReport("2026-08");
    expect(report.items.map((item) => item.name)).toEqual(["Dear", "Cheap"]);
  });

  it("reports an empty month as zero trips and no total", async () => {
    const report = await reports.getMonthReport("2026-08");
    expect(report).toMatchObject({ total: null, tripCount: 0, items: [] });
  });

  it("keeps a month with no prices at null rather than zero", async () => {
    await save("2026-08-02", [{ name: "Rice", quantity: 1, unit: "kg", totalPrice: null }]);

    const report = await reports.getMonthReport("2026-08");
    expect(report.total).toBeNull();
    expect(report.tripCount).toBe(1);
  });

  it("lists month totals newest first", async () => {
    await save("2026-06-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 100 }]);
    await save("2026-07-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 200 }]);
    await save("2026-08-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 300 }]);

    const months = await reports.listMonthTotals();
    expect(months.map((m) => m.month)).toEqual(["2026-08", "2026-07", "2026-06"]);
    expect(months.map((m) => m.total)).toEqual([300, 200, 100]);
  });

  it("lists ascending months for the chart", async () => {
    await save("2026-06-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 100 }]);
    await save("2026-08-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 300 }]);

    const months = await reports.listMonthTotalsAscending();
    expect(months.map((m) => m.month)).toEqual(["2026-06", "2026-08"]);
  });

  it("counts trips once even when they have many lines", async () => {
    await save("2026-08-02", [
      { name: "A", quantity: 1, unit: "pcs", totalPrice: 10 },
      { name: "B", quantity: 1, unit: "pcs", totalPrice: 20 },
      { name: "C", quantity: 1, unit: "pcs", totalPrice: 30 },
    ]);

    const [month] = await reports.listMonthTotals();
    expect(month.tripCount).toBe(1);
    expect(month.total).toBe(60);
  });

  it("skips months with no trips rather than emitting zeroes", async () => {
    await save("2026-06-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 100 }]);
    await save("2026-08-02", [{ name: "A", quantity: 1, unit: "pcs", totalPrice: 300 }]);

    const months = await reports.listMonthTotals();
    expect(months.map((m) => m.month)).not.toContain("2026-07");
  });
});
