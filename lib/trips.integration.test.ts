// @vitest-environment node

/** Exercises the real SQL against a real Postgres.
 *
 *  Opt-in: set TEST_DATABASE_URL and these run, otherwise they are skipped so
 *  `pnpm test` needs nothing installed. Point it at a throwaway database — the
 *  suite truncates every table between tests.
 *
 *    docker run -d --rm --name gf-test-pg -e POSTGRES_PASSWORD=gftest \
 *      -e POSTGRES_DB=grocery -p 55432:5432 postgres:16-alpine
 *    TEST_DATABASE_URL=postgresql://postgres:gftest@localhost:55432/grocery pnpm test
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const TEST_URL = process.env.TEST_DATABASE_URL;

// getSql() reads DATABASE_URL lazily, so pointing it at the test database
// before the first import is enough.
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

describe.skipIf(!TEST_URL)("trip persistence", () => {
  let db: typeof import("./db");
  let trips: typeof import("./trips");

  beforeAll(async () => {
    db = await import("./db");
    trips = await import("./trips");

    const schema = await readFile(
      fileURLToPath(new URL("./schema.sql", import.meta.url)),
      "utf8",
    );
    await db.getSql().unsafe(schema);
  });

  beforeEach(async () => {
    await db.getSql().unsafe(
      "truncate plan_items, plans, purchases, trips, items restart identity cascade",
    );
  });

  afterAll(async () => {
    await db.getSql().end();
  });

  const trip = (rows: { name: string; quantity: number; unit: string; totalPrice: number | null }[]) => ({
    shoppedAt: "2026-08-25",
    store: "Keells",
    rows: rows as never,
  });

  it("saves a trip with its lines and creates the items", async () => {
    const id = await trips.saveTrip(
      trip([
        { name: "Rice", quantity: 5, unit: "kg", totalPrice: 1250 },
        { name: "Milk", quantity: 2, unit: "L", totalPrice: 480.5 },
      ]),
      "Nimal",
    );

    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const recent = await trips.listRecentTrips();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      shoppedAt: "2026-08-25",
      store: "Keells",
      shopper: "Nimal",
      itemCount: 2,
      total: 1730.5,
    });
  });

  it("reuses one item row across differently-typed names", async () => {
    await trips.saveTrip(trip([{ name: "Red Onions", quantity: 1, unit: "kg", totalPrice: 300 }]), "A");
    await trips.saveTrip(trip([{ name: "red  onions", quantity: 2, unit: "kg", totalPrice: 600 }]), "B");

    const [{ count }] = await db
      .getSql()<{ count: string }[]>`select count(*)::text as count from items`;
    expect(Number(count)).toBe(1);

    // Both purchases still recorded, pointing at that single item.
    const [{ purchases }] = await db
      .getSql()<{ purchases: string }[]>`select count(*)::text as purchases from purchases`;
    expect(Number(purchases)).toBe(2);
  });

  it("reports a trip with no prices as null, not zero", async () => {
    await trips.saveTrip(
      trip([{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]),
      "Nimal",
    );

    const [recent] = await trips.listRecentTrips();
    expect(recent.total).toBeNull();
  });

  it("returns numeric columns as numbers, not strings", async () => {
    await trips.saveTrip(
      trip([{ name: "Rice", quantity: 5, unit: "kg", totalPrice: 1250.25 }]),
      "Nimal",
    );

    const [recent] = await trips.listRecentTrips();
    expect(typeof recent.total).toBe("number");
    expect(recent.total).toBe(1250.25);
  });

  it("deletes a trip and its lines, but keeps the items", async () => {
    const id = await trips.saveTrip(
      trip([{ name: "Rice", quantity: 5, unit: "kg", totalPrice: 1250 }]),
      "Nimal",
    );

    await trips.deleteTrip(id);

    expect(await trips.listRecentTrips()).toHaveLength(0);
    const [{ purchases }] = await db
      .getSql()<{ purchases: string }[]>`select count(*)::text as purchases from purchases`;
    expect(Number(purchases)).toBe(0);

    // The catalogue survives, so autocomplete still knows the item.
    expect(await trips.listCatalogItems()).toHaveLength(1);
  });

  it("lists catalogue items most-recently-bought first", async () => {
    await trips.saveTrip(
      { shoppedAt: "2026-06-01", store: null, rows: [{ name: "Old Thing", quantity: 1, unit: "pcs", totalPrice: null }] as never },
      "A",
    );
    await trips.saveTrip(
      { shoppedAt: "2026-08-01", store: null, rows: [{ name: "New Thing", quantity: 1, unit: "pcs", totalPrice: null }] as never },
      "A",
    );

    const catalog = await trips.listCatalogItems();
    expect(catalog.map((item) => item.name)).toEqual(["New Thing", "Old Thing"]);
  });

  it("remembers the unit an item is usually bought in", async () => {
    await trips.saveTrip(
      trip([{ name: "Rice", quantity: 5, unit: "kg", totalPrice: null }]),
      "A",
    );

    const [item] = await trips.listCatalogItems();
    expect(item.defaultUnit).toBe("kg");
  });

  it("lists distinct stores, most recent first", async () => {
    await trips.saveTrip(
      { shoppedAt: "2026-06-01", store: "Cargills", rows: [{ name: "A", quantity: 1, unit: "pcs", totalPrice: null }] as never },
      "A",
    );
    await trips.saveTrip(
      { shoppedAt: "2026-08-01", store: "Keells", rows: [{ name: "B", quantity: 1, unit: "pcs", totalPrice: null }] as never },
      "A",
    );
    await trips.saveTrip(
      { shoppedAt: "2026-08-02", store: "Keells", rows: [{ name: "C", quantity: 1, unit: "pcs", totalPrice: null }] as never },
      "A",
    );

    expect(await trips.listStores()).toEqual(["Keells", "Cargills"]);
  });

  it("rejects a non-positive quantity at the database level", async () => {
    await expect(
      trips.saveTrip(
        trip([{ name: "Rice", quantity: 0, unit: "kg", totalPrice: null }]),
        "A",
      ),
    ).rejects.toThrow();
  });

  it("rolls the whole trip back if one line fails", async () => {
    await expect(
      trips.saveTrip(
        trip([
          { name: "Good", quantity: 1, unit: "kg", totalPrice: null },
          { name: "Bad", quantity: -1, unit: "kg", totalPrice: null },
        ]),
        "A",
      ),
    ).rejects.toThrow();

    // No half-saved trip left behind.
    expect(await trips.listRecentTrips()).toHaveLength(0);
  });
});
