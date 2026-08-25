import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { getSql } from "@/lib/db";
import { currentMonthKey, formatMonth, monthRange } from "@/lib/month";

// Two people write to this database from two phones; a stale shell would show
// one of them the other's missing trip. Always render against live data.
export const dynamic = "force-dynamic";

async function MonthSummary() {
  const sql = getSql();
  const month = currentMonthKey();
  const { start, end } = monthRange(month);

  const [{ trips }] = await sql<{ trips: string }[]>`
    select count(*)::text as trips
    from trips
    where shopped_at between ${start} and ${end}
  `;

  if (Number(trips) === 0) {
    return (
      <EmptyState
        title={`Nothing recorded for ${formatMonth(month)}`}
        body="Log a shop trip and this page starts filling in — totals, quantities, and what next month is likely to need."
        actionLabel="Log a trip"
        actionHref="/log"
      />
    );
  }

  return (
    <p className="text-muted">
      {trips} trip{Number(trips) === 1 ? "" : "s"} recorded this month.
    </p>
  );
}

export default function MonthPage() {
  const month = currentMonthKey();

  return (
    <>
      <PageHeader title={formatMonth(month)} subtitle="This month so far" />
      <Suspense
        fallback={<div className="h-32 animate-pulse rounded-2xl bg-surface" />}
      >
        <MonthSummary />
      </Suspense>
    </>
  );
}
