import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { formatMoney } from "@/lib/money";
import { formatMonth, nextMonthKey, previousMonthKey } from "@/lib/month";
import { percentChange, type ItemSummary } from "@/lib/summary";
import { formatQuantity, type Unit } from "@/lib/units";

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

  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`/?m=${previous}`}
        aria-label={`Go to ${formatMonth(previous)}`}
        className="flex size-11 items-center justify-center rounded-xl border border-line text-muted"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </Link>

      <span className="font-semibold">{formatMonth(month)}</span>

      {canGoForward ? (
        <Link
          href={`/?m=${next}`}
          aria-label={`Go to ${formatMonth(next)}`}
          className="flex size-11 items-center justify-center rounded-xl border border-line text-muted"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 4l6 6-6 6" />
          </svg>
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
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5">
      <span className="text-sm text-muted">Spent this month</span>
      <span className="text-4xl font-semibold tabular-nums">
        {formatMoney(total)}
      </span>
      <span className="text-sm text-muted">
        {tripCount} trip{tripCount === 1 ? "" : "s"}
        {change !== null ? (
          <>
            {" · "}
            <span className={change > 0 ? "text-warning" : "text-accent"}>
              {change > 0 ? "+" : ""}
              {change}% vs last month
            </span>
          </>
        ) : null}
      </span>
    </div>
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
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <li key={item.name} className="flex items-baseline gap-3 px-4 py-3">
          <div className="flex flex-1 flex-col">
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-muted">
              {item.quantities
                .map((entry) => formatQuantity(entry.quantity, entry.unit as Unit))
                .join(" + ")}
            </span>
          </div>
          <span className="font-semibold tabular-nums">
            {formatMoney(item.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}
