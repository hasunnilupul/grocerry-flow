import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PlanList from "@/components/PlanList";
import { AddPlanItem, PlanCheckout } from "@/components/PlanCheckout";
import { generatePlanAction } from "./actions";
import { currentMonthKey, formatMonth, nextMonthKey } from "@/lib/month";
import { getPlanItems, previewPlan } from "@/lib/plan";
import { listCatalogItems, listStores } from "@/lib/trips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <Card>
          <CardHeader>
            <CardTitle>
              {predictions.length} item{predictions.length === 1 ? "" : "s"}{" "}
              predicted
            </CardTitle>
            <CardDescription>
              From what you bought over the last{" "}
              {predictions[0].monthsConsidered} month
              {predictions[0].monthsConsidered === 1 ? "" : "s"}. You can edit
              everything after building the list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {predictions.slice(0, 5).map((prediction) => (
                <li key={prediction.itemId} className="flex flex-wrap gap-x-2">
                  <span className="font-medium text-foreground">
                    {prediction.name}
                  </span>
                  <Badge variant="secondary" className="font-normal">
                    {prediction.reason}
                  </Badge>
                </li>
              ))}
              {predictions.length > 5 ? (
                <li>and {predictions.length - 5} more…</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <form action={generatePlanAction}>
          <input type="hidden" name="month" value={month} />
          <Button type="submit" className="h-12 w-full px-5">
            Build the list
          </Button>
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
        <Button
          type="submit"
          variant="link"
          className="h-11 w-full text-muted-foreground"
        >
          Re-predict from history (keeps items you added by hand)
        </Button>
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
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}
      >
        <PlanBody month={month} />
      </Suspense>
    </>
  );
}
