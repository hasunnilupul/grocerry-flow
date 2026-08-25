// @vitest-environment node

/** Plan generation and shopping-mode checkout against a real Postgres.
 *  Opt-in via TEST_DATABASE_URL — see lib/trips.integration.test.ts. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const TEST_URL = process.env.TEST_DATABASE_URL;
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

describe.skipIf(!TEST_URL)("plan", () => {
  let db: typeof import("./db");
  let trips: typeof import("./trips");
  let plan: typeof import("./plan");

  beforeAll(async () => {
    db = await import("./db");
    trips = await import("./trips");
    plan = await import("./plan");

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
  const save = (shoppedAt: string, rows: Row[]) =>
    trips.saveTrip({ shoppedAt, store: "Keells", rows: rows as never }, "Tester");

  /** Three months of buying 5 kg of rice and 2 L of milk. */
  async function seedRegularHistory() {
    for (const month of ["2026-06", "2026-07", "2026-08"]) {
      await save(`${month}-05`, [
        { name: "Rice", quantity: 5, unit: "kg", totalPrice: 1000 },
        { name: "Milk", quantity: 2, unit: "L", totalPrice: 400 },
      ]);
    }
  }

  it("predicts the regulars at their usual quantity", async () => {
    await seedRegularHistory();

    const predictions = await plan.previewPlan("2026-09");
    expect(predictions.map((p) => p.name).sort()).toEqual(["Milk", "Rice"]);
    expect(predictions.find((p) => p.name === "Rice")).toMatchObject({
      quantity: 5,
      unit: "kg",
      reason: "Bought every month",
    });
  });

  it("folds mixed units before predicting", async () => {
    await save("2026-06-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]);
    await save("2026-07-05", [{ name: "Rice", quantity: 5000, unit: "g", totalPrice: null }]);
    await save("2026-08-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]);

    const [prediction] = await plan.previewPlan("2026-09");
    expect(prediction).toMatchObject({ quantity: 5, unit: "kg" });
  });

  it("predicts nothing with no history at all", async () => {
    expect(await plan.previewPlan("2026-09")).toEqual([]);
  });

  it("saves the predicted list and reads it back", async () => {
    await seedRegularHistory();

    const count = await plan.generatePlan("2026-09");
    expect(count).toBe(2);

    const items = await plan.getPlanItems("2026-09");
    expect(items.map((item) => item.name).sort()).toEqual(["Milk", "Rice"]);
    expect(items.every((item) => item.source === "predicted")).toBe(true);
    expect(items.every((item) => item.checked === false)).toBe(true);
  });

  it("keeps hand-added items when the prediction is re-run", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");
    await plan.addPlanItem("2026-09", "Birthday Cake", 1, "pcs");

    await plan.generatePlan("2026-09");

    const items = await plan.getPlanItems("2026-09");
    expect(items.map((item) => item.name)).toContain("Birthday Cake");
    expect(items.find((item) => item.name === "Birthday Cake")?.source).toBe(
      "manual",
    );
  });

  it("ticks an item off and back on", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const [first] = await plan.getPlanItems("2026-09");
    await plan.setPlanItemChecked(first.id, true);
    expect(
      (await plan.getPlanItems("2026-09")).find((i) => i.id === first.id)?.checked,
    ).toBe(true);

    await plan.setPlanItemChecked(first.id, false);
    expect(
      (await plan.getPlanItems("2026-09")).find((i) => i.id === first.id)?.checked,
    ).toBe(false);
  });

  it("edits a quantity and removes an item", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const [first, second] = await plan.getPlanItems("2026-09");
    await plan.setPlanItemQuantity(first.id, 7.5);
    await plan.removePlanItem(second.id);

    const items = await plan.getPlanItems("2026-09");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(7.5);
  });

  it("turns the ticked items into a trip and clears them from the list", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const items = await plan.getPlanItems("2026-09");
    await plan.setPlanItemChecked(items[0].id, true);

    const result = await plan.convertCheckedToTrip(
      "2026-09",
      "2026-09-03",
      "Keells",
      "Tester",
    );

    expect(result).toMatchObject({ itemCount: 1 });

    // The bought item leaves the list; the unticked one stays.
    const remaining = await plan.getPlanItems("2026-09");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(items[1].id);

    // And it is a real trip now.
    const recent = await trips.listRecentTrips(1);
    expect(recent[0]).toMatchObject({
      shoppedAt: "2026-09-03",
      itemCount: 1,
      total: null,
    });
  });

  it("does nothing when nothing is ticked", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    expect(
      await plan.convertCheckedToTrip("2026-09", "2026-09-03", null, "Tester"),
    ).toBeNull();
    expect(await plan.getPlanItems("2026-09")).toHaveLength(2);
  });

  it("keeps two months' plans separate", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");
    await plan.addPlanItem("2026-10", "Only In October", 1, "pcs");

    expect(await plan.getPlanItems("2026-09")).toHaveLength(2);
    const october = await plan.getPlanItems("2026-10");
    expect(october.map((item) => item.name)).toEqual(["Only In October"]);
  });

  it("updates rather than duplicating when the same item is added twice", async () => {
    await plan.addPlanItem("2026-09", "Rice", 3, "kg");
    await plan.addPlanItem("2026-09", "rice", 5, "kg");

    const items = await plan.getPlanItems("2026-09");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });
});
