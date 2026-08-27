import { cacheLife, cacheTag } from "next/cache";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PlanList from "@/components/PlanList";
import { AddPlanItem, PlanCheckout } from "@/components/PlanCheckout";
import { generatePlanAction } from "./actions";
import { PLANS_TAG, TRIPS_TAG } from "@/lib/cache-tags";
import { thisMonth } from "@/lib/clock";
import { formatMonth, nextMonthKey } from "@/lib/month";
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

/** The list, the suggestions behind the "add" field and the prediction shown
 *  before the list exists all come from the same two tables, so they share one
 *  cache entry that every plan action clears. */
async function PlanBody({ month }: { month: string }) {
  "use cache";
  cacheLife("max");
  cacheTag(TRIPS_TAG, PLANS_TAG);

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

  const checked = items.filter((item) => item.checked);
  const priced = checked.filter((item) => item.price !== null);
  const checkedTotal = priced.length
    ? Math.round(priced.reduce((sum, item) => sum + (item.price ?? 0), 0) * 100) /
      100
    : null;

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
        checkedCount={checked.length}
        checkedTotal={checkedTotal}
        totalCount={items.length}
        stores={stores}
      />
    </div>
  );
}

export default async function PlanPage() {
  const month = nextMonthKey(await thisMonth());

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`Shopping list for ${formatMonth(month)}`}
      />
      <PlanBody month={month} />
    </>
  );
}
