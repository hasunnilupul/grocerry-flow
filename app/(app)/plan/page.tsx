import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PlanList from "@/components/PlanList";
import { AddPlanItem, PlanCheckout } from "@/components/PlanCheckout";
import { generatePlanAction } from "./actions";
import { currentMonthKey, formatMonth, nextMonthKey } from "@/lib/month";
import { getPlanItems, previewPlan } from "@/lib/plan";
import { listCatalogItems, listStores } from "@/lib/trips";

export const dynamic = "force-dynamic";

async function PlanBody({ month }: { month: string }) {
  const [items, catalog, stores] = await Promise.all([
    getPlanItems(month),
    listCatalogItems(),
    listStores(),
  ]);

  if (items.length === 0) {
    const predictions = await previewPlan(month);

    if (predictions.length === 0) {
      return (
        <EmptyState
          title="Not enough history yet"
          body="Log a month or two of shopping and this page will suggest what next month needs, based on what you actually buy."
          actionLabel="Log a trip"
          actionHref="/log"
        />
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold">
            {predictions.length} item{predictions.length === 1 ? "" : "s"} predicted
          </h2>
          <p className="mt-1 text-sm text-muted">
            From what you bought over the last {predictions[0].monthsConsidered}{" "}
            month{predictions[0].monthsConsidered === 1 ? "" : "s"}. You can edit
            everything after building the list.
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
            {predictions.slice(0, 5).map((prediction) => (
              <li key={prediction.itemId}>
                {prediction.name} — {prediction.reason}
              </li>
            ))}
            {predictions.length > 5 ? (
              <li>and {predictions.length - 5} more…</li>
            ) : null}
          </ul>
        </div>

        <form action={generatePlanAction}>
          <input type="hidden" name="month" value={month} />
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-accent px-5 font-semibold text-on-accent"
          >
            Build the list
          </button>
        </form>
      </div>
    );
  }

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <div className="flex flex-col gap-4">
      <PlanList items={items} month={month} />

      <AddPlanItem month={month} itemNames={catalog.map((item) => item.name)} />

      <form action={generatePlanAction}>
        <input type="hidden" name="month" value={month} />
        <button
          type="submit"
          className="min-h-11 w-full text-sm text-muted underline"
        >
          Re-predict from history (keeps items you added by hand)
        </button>
      </form>

      <PlanCheckout
        month={month}
        checkedCount={checkedCount}
        totalCount={items.length}
        stores={stores}
      />
    </div>
  );
}

export default function PlanPage() {
  const month = nextMonthKey(currentMonthKey());

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`Shopping list for ${formatMonth(month)}`}
      />
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface" />}
      >
        <PlanBody month={month} />
      </Suspense>
    </>
  );
}
