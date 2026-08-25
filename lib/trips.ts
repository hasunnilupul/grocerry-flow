import "server-only";
import { getSql, num, numOrNull } from "./db";
import { normalizeItemName } from "./items";
import type { ParsedTrip } from "./trip-form";

export type CatalogItem = {
  id: string;
  name: string;
  defaultUnit: string;
};

/** Known items, most recently bought first, so the suggestions people see are
 *  the things they actually buy rather than an alphabetical wall. */
export async function listCatalogItems(limit = 300): Promise<CatalogItem[]> {
  const sql = getSql();
  const rows = await sql<
    { id: string; name: string; default_unit: string }[]
  >`
    select i.id, i.name, i.default_unit
    from items i
    left join purchases p on p.item_id = i.id
    left join trips t on t.id = p.trip_id
    group by i.id, i.name, i.default_unit
    order by max(t.shopped_at) desc nulls last, i.name asc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultUnit: row.default_unit,
  }));
}

/** Stores already used, for the store field's suggestions. */
export async function listStores(limit = 20): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ store: string }[]>`
    select store
    from trips
    where store is not null and store <> ''
    group by store
    order by max(shopped_at) desc
    limit ${limit}
  `;
  return rows.map((row) => row.store);
}

export type RecentTrip = {
  id: string;
  shoppedAt: string;
  store: string | null;
  shopper: string | null;
  itemCount: number;
  total: number | null;
};

export async function listRecentTrips(limit = 10): Promise<RecentTrip[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      shopped_at: Date;
      store: string | null;
      shopper: string | null;
      item_count: string;
      total: string | null;
    }[]
  >`
    select
      t.id,
      t.shopped_at,
      t.store,
      t.shopper,
      count(p.id)::text as item_count,
      sum(p.total_price) as total
    from trips t
    left join purchases p on p.trip_id = t.id
    group by t.id
    order by t.shopped_at desc, t.created_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    shoppedAt: toIsoDate(row.shopped_at),
    store: row.store,
    shopper: row.shopper,
    itemCount: num(row.item_count),
    total: numOrNull(row.total),
  }));
}

/** `date` columns come back as a Date at local midnight; take the calendar
 *  parts rather than toISOString(), which would shift the day west of UTC. */
export function toIsoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Insert a trip and its lines in one transaction, creating any items that are
 *  new to the household along the way. */
export async function saveTrip(
  trip: ParsedTrip,
  shopper: string | null,
): Promise<string> {
  const sql = getSql();

  return sql.begin(async (tx) => {
    const [created] = await tx<{ id: string }[]>`
      insert into trips (shopped_at, store, shopper)
      values (${trip.shoppedAt}, ${trip.store}, ${shopper})
      returning id
    `;

    for (const row of trip.rows) {
      const normalized = normalizeItemName(row.name);

      // Claim the name if it's new; otherwise take the existing row's id.
      // `do update` rather than `do nothing` so RETURNING always yields a row.
      const [item] = await tx<{ id: string }[]>`
        insert into items (name, normalized_name, default_unit)
        values (${row.name}, ${normalized}, ${row.unit})
        on conflict (normalized_name)
          do update set default_unit = excluded.default_unit
        returning id
      `;

      await tx`
        insert into purchases (trip_id, item_id, quantity, unit, total_price)
        values (${created.id}, ${item.id}, ${row.quantity}, ${row.unit}, ${row.totalPrice})
      `;
    }

    return created.id;
  });
}

export async function deleteTrip(id: string): Promise<void> {
  const sql = getSql();
  await sql`delete from trips where id = ${id}`;
}
