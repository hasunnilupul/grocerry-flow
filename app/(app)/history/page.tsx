import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import SpendChart from "@/components/SpendChart";
import { formatMonth } from "@/lib/month";
import { formatMoney } from "@/lib/money";
import { listMonthTotalsAscending } from "@/lib/reports";
import { TRIPS_TAG } from "@/lib/cache-tags";
import { averageSpend } from "@/lib/summary";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/** Nothing here changes until a trip does, so the whole chart and table are
 *  cached as rendered output and re-used on every visit. */
async function HistoryBody() {
  "use cache";
  cacheLife("max");
  cacheTag(TRIPS_TAG);

  const months = await listMonthTotalsAscending(12);

  if (months.length === 0) {
    return (
      <EmptyState
        title="No months to compare yet"
        body="Recorded months show up here with their totals, so you can see what changed."
        actionLabel="Log a trip"
        actionHref="/log"
      />
    );
  }

  const average = averageSpend(months);
  const newestFirst = [...months].reverse();

  return (
    <div className="flex flex-col gap-5">
      <SpendChart months={months} />

      {average !== null ? (
        <p className="text-sm text-muted-foreground">
          Averaging{" "}
          <span className="font-semibold text-foreground">{formatMoney(average)}</span>{" "}
          a month across {months.length} month
          {months.length === 1 ? "" : "s"}.
        </p>
      ) : null}

      {/* Also the chart's table view: every value is here, in text. */}
      <Card className="gap-0 overflow-hidden py-0">
        <ul className="flex flex-col">
          {newestFirst.map((month, index) => (
            <li key={month.month}>
              {index > 0 ? <Separator /> : null}
              <Link
                href={`/?m=${month.month}`}
                className="flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {formatMonth(month.month)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {month.tripCount} trip{month.tripCount === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatMoney(month.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="History" subtitle="Month by month" />
      <HistoryBody />
    </>
  );
}
