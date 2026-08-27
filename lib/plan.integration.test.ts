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

  it("starts each predicted row at what it cost last time", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const items = await plan.getPlanItems("2026-09");
    // Rice was 5 kg for 1000 every month, and 5 kg is predicted.
    expect(items.find((i) => i.name === "Rice")?.price).toBe(1000);
    expect(items.find((i) => i.name === "Milk")?.price).toBe(400);
  });

  it("uses the most recent price, not the oldest", async () => {
    await save("2026-06-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: 800 }]);
    await save("2026-07-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: 900 }]);
    await save("2026-08-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: 1100 }]);

    await plan.generatePlan("2026-09");

    const [item] = await plan.getPlanItems("2026-09");
    expect(item.price).toBe(1100);
  });

  it("scales the last price to the predicted quantity", async () => {
    // Bought 4 kg twice at 800, then 4 kg again — prediction is 4 kg at 800.
    await save("2026-06-05", [{ name: "Rice", quantity: 4, unit: "kg", totalPrice: 800 }]);
    await save("2026-07-05", [{ name: "Rice", quantity: 4, unit: "kg", totalPrice: 800 }]);
    await save("2026-08-05", [{ name: "Rice", quantity: 4, unit: "kg", totalPrice: 800 }]);

    await plan.generatePlan("2026-09");
    const [item] = await plan.getPlanItems("2026-09");
    expect(item.quantity).toBe(4);
    expect(item.price).toBe(800);

    // Halve the quantity and the suggestion should halve with it.
    await plan.setPlanItemFields(item.id, { quantity: 2, unit: "kg", price: 400 });
    const [updated] = await plan.getPlanItems("2026-09");
    expect(updated.price).toBe(400);
  });

  it("leaves the price empty when the item was never priced", async () => {
    await save("2026-06-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]);
    await save("2026-07-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]);
    await save("2026-08-05", [{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]);

    await plan.generatePlan("2026-09");

    const [item] = await plan.getPlanItems("2026-09");
    expect(item.price).toBeNull();
  });

  it("gives a hand-added item its last price too", async () => {
    await save("2026-08-05", [
      { name: "Cinnamon", quantity: 2, unit: "kg", totalPrice: 600 },
    ]);

    await plan.addPlanItem("2026-09", "Cinnamon", 1, "kg");

    const item = (await plan.getPlanItems("2026-09")).find(
      (i) => i.name === "Cinnamon",
    );
    // 600 for 2 kg, so 1 kg is 300.
    expect(item?.price).toBe(300);
  });

  it("does not wipe a typed price when the item is re-added", async () => {
    await save("2026-08-05", [
      { name: "Cinnamon", quantity: 2, unit: "kg", totalPrice: 600 },
    ]);
    await plan.addPlanItem("2026-09", "Cinnamon", 1, "kg");

    const before = (await plan.getPlanItems("2026-09"))[0];
    await plan.setPlanItemFields(before.id, {
      quantity: 1,
      unit: "kg",
      price: 999,
    });

    await plan.addPlanItem("2026-09", "Cinnamon", 3, "kg");

    const after = (await plan.getPlanItems("2026-09"))[0];
    expect(after.quantity).toBe(3);
    expect(after.price).toBe(999);
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

  it("edits quantity, unit and price, and removes an item", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const [first, second] = await plan.getPlanItems("2026-09");
    await plan.setPlanItemFields(first.id, {
      quantity: 7.5,
      unit: "g",
      price: 320.5,
    });
    await plan.removePlanItem(second.id);

    const items = await plan.getPlanItems("2026-09");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantity: 7.5, unit: "g", price: 320.5 });
  });

  it("keeps an unpriced item null rather than zero", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const [first] = await plan.getPlanItems("2026-09");
    await plan.setPlanItemFields(first.id, {
      quantity: 1,
      unit: "kg",
      price: null,
    });

    const items = await plan.getPlanItems("2026-09");
    expect(items.find((i) => i.id === first.id)?.price).toBeNull();
  });

  it("carries the prices from the list into the trip it becomes", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const items = await plan.getPlanItems("2026-09");
    await plan.setPlanItemFields(items[0].id, {
      quantity: 2,
      unit: "kg",
      price: 900,
    });
    await plan.setPlanItemFields(items[1].id, {
      quantity: 1,
      unit: "L",
      price: 330.25,
    });
    await plan.setPlanItemChecked(items[0].id, true);
    await plan.setPlanItemChecked(items[1].id, true);

    await plan.convertCheckedToTrip("2026-09", "2026-09-03", "Keells", "Tester");

    // The whole point of entering prices on the list: the trip is complete,
    // with no second pass needed anywhere else.
    const [recent] = await trips.listRecentTrips(1);
    expect(recent).toMatchObject({ itemCount: 2, total: 1230.25 });
  });

  it("records an unpriced ticked item without inventing a zero", async () => {
    await seedRegularHistory();
    await plan.generatePlan("2026-09");

    const items = await plan.getPlanItems("2026-09");
    // Rows now arrive pre-priced from history, so clear it to test the case
    // this is actually about: a row deliberately left without a price.
    await plan.setPlanItemFields(items[0].id, {
      quantity: items[0].quantity,
      unit: items[0].unit,
      price: null,
    });
    await plan.setPlanItemChecked(items[0].id, true);

    await plan.convertCheckedToTrip("2026-09", "2026-09-03", null, "Tester");

    const [recent] = await trips.listRecentTrips(1);
    expect(recent.total).toBeNull();
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

    // And it is a real trip now, priced from what the item cost last time.
    const recent = await trips.listRecentTrips(1);
    expect(recent[0]).toMatchObject({
      shoppedAt: "2026-09-03",
      itemCount: 1,
      total: 400,
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
