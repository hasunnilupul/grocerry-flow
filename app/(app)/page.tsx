import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import PageHeader from "@/components/PageHeader";
import {
  ItemList,
  MonthNav,
  SpendHeadline,
} from "@/components/MonthSummaryView";
import { TRIPS_TAG } from "@/lib/cache-tags";
import { thisMonth } from "@/lib/clock";
import { isMonthKey, previousMonthKey } from "@/lib/month";
import { getMonthReport } from "@/lib/reports";

/** One cache entry per month, invalidated the moment a trip is saved or
 *  deleted — so the two phones never disagree, and walking back through the
 *  months costs a query the first time only. */
async function MonthBody({ month }: { month: string }) {
  "use cache";
  cacheLife("max");
  cacheTag(TRIPS_TAG);

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

/** `?m=` is request data, so it can't live in the prerendered shell — hence
 *  the boundary below. The bottom nav prefetches this route with its URL, so
 *  by the time the tab is tapped the month is usually already resolved. */
async function MonthView({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { m } = await searchParams;
  const latestMonth = await thisMonth();
  // `?m=` lets the arrows walk back through history without a client bundle.
  const month = typeof m === "string" && isMonthKey(m) ? m : latestMonth;

  return (
    <>
      <div className="mb-4">
        <MonthNav month={month} latestMonth={latestMonth} />
      </div>
      <MonthBody month={month} />
    </>
  );
}

export default function MonthPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Month" subtitle="What the household bought" />
      <Suspense
        fallback={<div className="h-72 animate-pulse rounded-2xl bg-card" />}
      >
        <MonthView searchParams={searchParams} />
      </Suspense>
    </>
  );
}
