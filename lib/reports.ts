import "server-only";
import { getSql, num, numOrNull } from "./db";
import { monthRange, type MonthKey } from "./month";
import { foldItemQuantities, type ItemSummary, type MonthTotal, type PurchaseRow } from "./summary";
import type { Unit } from "./units";

export type MonthReport = {
  month: MonthKey;
  total: number | null;
  tripCount: number;
  items: ItemSummary[];
};

export async function getMonthReport(month: MonthKey): Promise<MonthReport> {
  const sql = getSql();
  const { start, end } = monthRange(month);

  const [totals, lines] = await Promise.all([
    sql<{ total: string | null; trip_count: string }[]>`
      select
        (select sum(p.total_price)
           from purchases p
           join trips t2 on t2.id = p.trip_id
          where t2.shopped_at between ${start} and ${end}) as total,
        (select count(*)::text
           from trips t3
          where t3.shopped_at between ${start} and ${end}) as trip_count
    `,
    sql<{ name: string; unit: string; quantity: string; total: string | null }[]>`
      select
        i.name,
        p.unit,
        sum(p.quantity)    as quantity,
        sum(p.total_price) as total
      from purchases p
      join trips t on t.id = p.trip_id
      join items i on i.id = p.item_id
      where t.shopped_at between ${start} and ${end}
      group by i.id, i.name, p.unit
    `,
  ]);

  const rows: PurchaseRow[] = lines.map((line) => ({
    name: line.name,
    unit: line.unit as Unit,
    quantity: num(line.quantity),
    total: numOrNull(line.total),
  }));

  return {
    month,
    total: numOrNull(totals[0]?.total ?? null),
    tripCount: num(totals[0]?.trip_count ?? "0"),
    items: foldItemQuantities(rows),
  };
}

/** Every month that has at least one trip, newest first. */
export async function listMonthTotals(limit = 12): Promise<MonthTotal[]> {
  const sql = getSql();

  const rows = await sql<
    { month: string; total: string | null; trip_count: string }[]
  >`
    select
      to_char(date_trunc('month', t.shopped_at), 'YYYY-MM') as month,
      sum(p.total_price)                                    as total,
      count(distinct t.id)::text                            as trip_count
    from trips t
    left join purchases p on p.trip_id = t.id
    group by 1
    order by 1 desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    month: row.month,
    total: numOrNull(row.total),
    tripCount: num(row.trip_count),
  }));
}

/** Months with data, oldest first — the order the chart draws them in. */
export async function listMonthTotalsAscending(limit = 12): Promise<MonthTotal[]> {
  return (await listMonthTotals(limit)).reverse();
}
