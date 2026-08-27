import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { formatMoney } from "@/lib/money";
import { formatMonth, nextMonthKey, previousMonthKey } from "@/lib/month";
import { percentChange, type ItemSummary } from "@/lib/summary";
import { formatQuantity, type Unit } from "@/lib/units";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function MonthNav({
  month,
  latestMonth,
}: {
  month: string;
  latestMonth: string;
}) {
  const previous = previousMonthKey(month);
  const next = nextMonthKey(month);
  const canGoForward = next <= latestMonth;

  // Both arrows are navigations wearing button clothes, so they borrow the
  // classes and stay links rather than going through Base UI's Button.
  const arrow = cn(
    buttonVariants({ variant: "outline" }),
    "size-11 text-muted-foreground",
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`/?m=${previous}`}
        aria-label={`Go to ${formatMonth(previous)}`}
        className={arrow}
      >
        <ChevronLeftIcon />
      </Link>

      <span className="font-semibold">{formatMonth(month)}</span>

      {canGoForward ? (
        <Link
          href={`/?m=${next}`}
          aria-label={`Go to ${formatMonth(next)}`}
          className={arrow}
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        // Keep the row balanced when there's no later month to go to.
        <span className="size-11" aria-hidden="true" />
      )}
    </div>
  );
}

export function SpendHeadline({
  total,
  previousTotal,
  tripCount,
}: {
  total: number | null;
  previousTotal: number | null;
  tripCount: number;
}) {
  const change = percentChange(total, previousTotal);

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-1 px-5 py-5">
        <span className="text-sm text-muted-foreground">Spent this month</span>
        <span className="text-4xl font-semibold tabular-nums">
          {formatMoney(total)}
        </span>
        <span className="text-sm text-muted-foreground">
          {tripCount} trip{tripCount === 1 ? "" : "s"}
          {change !== null ? (
            <>
              {" · "}
              <span className={change > 0 ? "text-warning" : "text-primary"}>
                {change > 0 ? "+" : ""}
                {change}% vs last month
              </span>
            </>
          ) : null}
        </span>
      </CardContent>
    </Card>
  );
}

export function ItemList({ items }: { items: ItemSummary[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing recorded for this month"
        body="Log a shop trip and this month's totals and quantities fill in."
        actionLabel="Log a trip"
        actionHref="/log"
      />
    );
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.name}>
            {index > 0 ? <Separator /> : null}
            <div className="flex items-baseline gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.name}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {item.quantities
                    .map((entry) =>
                      formatQuantity(entry.quantity, entry.unit as Unit),
                    )
                    .join(" + ")}
                </span>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatMoney(item.total)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
