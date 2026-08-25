import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import {
  ItemList,
  MonthNav,
  SpendHeadline,
} from "@/components/MonthSummaryView";
import { currentMonthKey, isMonthKey, previousMonthKey } from "@/lib/month";
import { getMonthReport } from "@/lib/reports";

// Two people write to this database from two phones; a stale shell would show
// one of them the other's missing trip. Always render against live data.
export const dynamic = "force-dynamic";

async function MonthBody({ month }: { month: string }) {
  const [report, previous] = await Promise.all([
    getMonthReport(month),
    getMonthReport(previousMonthKey(month)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SpendHeadline
        total={report.total}
        previousTotal={previous.total}
        tripCount={report.tripCount}
      />
      <ItemList items={report.items} />
    </div>
  );
}

export default async function MonthPage({ searchParams }: PageProps<"/">) {
  const { m } = await searchParams;
  const thisMonth = currentMonthKey();
  // `?m=` lets the arrows walk back through history without a client bundle.
  const month = typeof m === "string" && isMonthKey(m) ? m : thisMonth;

  return (
    <>
      <PageHeader title="Month" subtitle="What the household bought" />
      <div className="mb-4">
        <MonthNav month={month} latestMonth={thisMonth} />
      </div>

      <Suspense
        key={month}
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}
      >
        <MonthBody month={month} />
      </Suspense>
    </>
  );
}
