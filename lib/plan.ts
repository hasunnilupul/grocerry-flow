import "server-only";
import { getSql, num, numOrNull } from "./db";
import { lastNMonths, monthRange, type MonthKey } from "./month";
import { predictNextMonth, type ItemHistory, type Prediction } from "./predict";
import { baseUnit, toBaseQuantity, type Unit } from "./units";
import { normalizeItemName } from "./items";
import { estimatePrice, type LastPurchase } from "./pricing";

/** How far back the prediction looks. Six months is enough to spot a quarterly
 *  item without letting last year's habits outvote this year's. */
export const HISTORY_MONTHS = 6;

export type PlanItem = {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: Unit;
  /** null means "not recorded", which is different from zero and survives all
   *  the way into the trip this list becomes. */
  price: number | null;
  source: "predicted" | "manual";
  checked: boolean;
};

/** Per-item monthly totals over the history window, folded to a base unit so
 *  a month bought in grams and a month bought in kilos compare properly. */
async function loadHistories(
  months: MonthKey[],
): Promise<ItemHistory[]> {
  const sql = getSql();
  const { start } = monthRange(months[0]);
  const { end } = monthRange(months[months.length - 1]);

  const rows = await sql<
    {
      item_id: string;
      name: string;
      month: string;
      unit: string;
      quantity: string;
    }[]
  >`
    select
      i.id   as item_id,
      i.name as name,
      to_char(date_trunc('month', t.shopped_at), 'YYYY-MM') as month,
      p.unit as unit,
      sum(p.quantity) as quantity
    from purchases p
    join trips t on t.id = p.trip_id
    join items i on i.id = p.item_id
    where t.shopped_at between ${start} and ${end}
    group by i.id, i.name, 3, p.unit
    order by 3 asc
  `;

  const byItem = new Map<string, ItemHistory & { byMonth: Map<string, number> }>();

  for (const row of rows) {
    let entry = byItem.get(row.item_id);
    if (!entry) {
      entry = {
        itemId: row.item_id,
        name: row.name,
        // The unit an item is predicted in is the base of whatever it's bought
        // in; mixed g/kg history collapses to kg.
        unit: baseUnit(row.unit as Unit),
        monthlyQuantities: [],
        byMonth: new Map(),
      };
      byItem.set(row.item_id, entry);
    }

    const converted = toBaseQuantity(num(row.quantity), row.unit as Unit);
    entry.byMonth.set(row.month, (entry.byMonth.get(row.month) ?? 0) + converted);
  }

  return [...byItem.values()].map((entry) => ({
    itemId: entry.itemId,
    name: entry.name,
    unit: entry.unit,
    monthlyQuantities: [...entry.byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, quantity]) => ({ month, quantity })),
  }));
}

/** What the prediction would say right now, without saving anything. */
export async function previewPlan(targetMonth: MonthKey): Promise<Prediction[]> {
  const sql = getSql();

  // Only count months that actually have trips — an account created last week
  // must not be judged against six months of silence.
  const [{ months_with_data }] = await sql<{ months_with_data: string }[]>`
    select count(distinct date_trunc('month', shopped_at))::text as months_with_data
    from trips
  `;

  const considered = Math.min(HISTORY_MONTHS, num(months_with_data));
  if (considered === 0) return [];

  const window = lastNMonths(targetMonth, HISTORY_MONTHS + 1).slice(0, -1);
  const histories = await loadHistories(window);

  return predictNextMonth(histories, targetMonth, considered);
}

/** The most recent purchase of each item that actually had a price on it, so
 *  a new list can start from what things cost last time. Items only ever
 *  bought without a price simply do not appear. */
export async function lastPricedPurchases(): Promise<Map<string, LastPurchase>> {
  const sql = getSql();

  const rows = await sql<
    { item_id: string; quantity: string; unit: string; total_price: string }[]
  >`
    select distinct on (p.item_id)
      p.item_id, p.quantity, p.unit, p.total_price
    from purchases p
    join trips t on t.id = p.trip_id
    where p.total_price is not null
    order by p.item_id, t.shopped_at desc, p.created_at desc
  `;

  return new Map(
    rows.map((row) => [
      row.item_id,
      {
        quantity: num(row.quantity),
        unit: row.unit as Unit,
        totalPrice: num(row.total_price),
      },
    ]),
  );
}

export async function getPlanItems(targetMonth: MonthKey): Promise<PlanItem[]> {
  const sql = getSql();
  const monthStart = `${targetMonth}-01`;

  const rows = await sql<
    {
      id: string;
      item_id: string;
      name: string;
      quantity: string;
      unit: string;
      total_price: string | null;
      source: string;
      checked: boolean;
    }[]
  >`
    select
      pi.id, pi.item_id, i.name, pi.quantity, pi.unit,
      pi.total_price, pi.source, pi.checked
    from plan_items pi
    join plans p on p.id = pi.plan_id
    join items i on i.id = pi.item_id
    where p.month = ${monthStart}
    order by pi.checked asc, i.name asc
  `;

  return rows.map((row) => ({
    id: row.id,
    itemId: row.item_id,
    name: row.name,
    quantity: num(row.quantity),
    unit: row.unit as Unit,
    price: numOrNull(row.total_price),
    source: row.source === "manual" ? "manual" : "predicted",
    checked: row.checked,
  }));
}

async function ensurePlan(month: MonthKey): Promise<string> {
  const sql = getSql();
  const monthStart = `${month}-01`;

  const [plan] = await sql<{ id: string }[]>`
    insert into plans (month) values (${monthStart})
    on conflict (month) do update set month = excluded.month
    returning id
  `;
  return plan.id;
}

/** Replace the predicted rows for a month, leaving hand-added ones alone —
 *  regenerating must never throw away something someone typed in themselves. */
export async function generatePlan(targetMonth: MonthKey): Promise<number> {
  const sql = getSql();
  const [predictions, lastPrices] = await Promise.all([
    previewPlan(targetMonth),
    lastPricedPurchases(),
  ]);
  const planId = await ensurePlan(targetMonth);

  return sql.begin(async (tx) => {
    await tx`
      delete from plan_items
      where plan_id = ${planId} and source = 'predicted'
    `;

    for (const prediction of predictions) {
      // Start from what this cost last time, at that rate. The shopper
      // overwrites it at the till when the price has moved.
      const price = estimatePrice(
        lastPrices.get(prediction.itemId),
        prediction.quantity,
        prediction.unit,
      );

      await tx`
        insert into plan_items (plan_id, item_id, quantity, unit, total_price, source)
        values (${planId}, ${prediction.itemId}, ${prediction.quantity}, ${prediction.unit}, ${price}, 'predicted')
        on conflict (plan_id, item_id) do nothing
      `;
    }

    return predictions.length;
  });
}

export async function addPlanItem(
  targetMonth: MonthKey,
  name: string,
  quantity: number,
  unit: Unit,
): Promise<void> {
  const sql = getSql();
  const planId = await ensurePlan(targetMonth);
  const normalized = normalizeItemName(name);

  await sql.begin(async (tx) => {
    const [item] = await tx<{ id: string }[]>`
      insert into items (name, normalized_name, default_unit)
      values (${name}, ${normalized}, ${unit})
      on conflict (normalized_name) do update set default_unit = excluded.default_unit
      returning id
    `;

    // Hand-added items get the same head start as predicted ones.
    const [previous] = await tx<
      { quantity: string; unit: string; total_price: string }[]
    >`
      select p.quantity, p.unit, p.total_price
      from purchases p
      join trips t on t.id = p.trip_id
      where p.item_id = ${item.id} and p.total_price is not null
      order by t.shopped_at desc, p.created_at desc
      limit 1
    `;

    const price = estimatePrice(
      previous
        ? {
            quantity: num(previous.quantity),
            unit: previous.unit as Unit,
            totalPrice: num(previous.total_price),
          }
        : null,
      quantity,
      unit,
    );

    await tx`
      insert into plan_items (plan_id, item_id, quantity, unit, total_price, source)
      values (${planId}, ${item.id}, ${quantity}, ${unit}, ${price}, 'manual')
      on conflict (plan_id, item_id)
        -- Leave the price alone: the row may already carry one that was
        -- typed by hand, and re-adding must not wipe it.
        do update set quantity = excluded.quantity, unit = excluded.unit
    `;
  });
}

export async function setPlanItemChecked(
  id: string,
  checked: boolean,
): Promise<void> {
  const sql = getSql();
  await sql`update plan_items set checked = ${checked} where id = ${id}`;
}

/** Quantity, unit and price are edited together on the row, so they save
 *  together — one round trip instead of three. */
export async function setPlanItemFields(
  id: string,
  fields: { quantity: number; unit: Unit; price: number | null },
): Promise<void> {
  const sql = getSql();
  await sql`
    update plan_items
       set quantity    = ${fields.quantity},
           unit        = ${fields.unit},
           total_price = ${fields.price}
     where id = ${id}
  `;
}

export async function removePlanItem(id: string): Promise<void> {
  const sql = getSql();
  await sql`delete from plan_items where id = ${id}`;
}

/** Turn everything ticked into a real trip, and clear those rows from the plan
 *  so the list left behind is exactly what still needs buying. */
export async function convertCheckedToTrip(
  targetMonth: MonthKey,
  shoppedAt: string,
  store: string | null,
  shopper: string | null,
): Promise<{ tripId: string; itemCount: number } | null> {
  const sql = getSql();
  const checked = (await getPlanItems(targetMonth)).filter((item) => item.checked);
  if (checked.length === 0) return null;

  return sql.begin(async (tx) => {
    const [trip] = await tx<{ id: string }[]>`
      insert into trips (shopped_at, store, shopper)
      values (${shoppedAt}, ${store}, ${shopper})
      returning id
    `;

    for (const item of checked) {
      // The price typed on the list is the price of the purchase; an item
      // left blank stays blank rather than becoming a zero-cost purchase.
      await tx`
        insert into purchases (trip_id, item_id, quantity, unit, total_price)
        values (${trip.id}, ${item.itemId}, ${item.quantity}, ${item.unit}, ${item.price})
      `;
      await tx`delete from plan_items where id = ${item.id}`;
    }

    return { tripId: trip.id, itemCount: checked.length };
  });
}
