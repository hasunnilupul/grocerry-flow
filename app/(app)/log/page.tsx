import { cacheLife, cacheTag } from "next/cache";
import LogEntryPanel from "@/components/LogEntryPanel";
import PageHeader from "@/components/PageHeader";
import RecentTrips from "@/components/RecentTrips";
import { TRIPS_TAG } from "@/lib/cache-tags";
import { todayForForms } from "@/lib/clock";
import { listCatalogItems, listRecentTrips, listStores } from "@/lib/trips";

/** Held until a trip is logged or deleted, so leaving this tab and coming back
 *  re-renders nothing. `today` is an argument rather than a call to the clock
 *  in here, because it belongs to the cache key: a new day gets its own entry
 *  instead of the form defaulting to the day it was first cached. */
async function LogEntryLoader({ today }: { today: string }) {
  "use cache";
  cacheLife("max");
  cacheTag(TRIPS_TAG);

  // Both feed the form's suggestions; nothing depends on the other.
  const [catalog, stores] = await Promise.all([
    listCatalogItems(),
    listStores(),
  ]);

  return <LogEntryPanel today={today} catalog={catalog} stores={stores} />;
}

async function RecentTripsLoader() {
  "use cache";
  cacheLife("max");
  cacheTag(TRIPS_TAG);

  const trips = await listRecentTrips(5);
  return <RecentTrips trips={trips} />;
}

export default async function LogPage() {
  return (
    <>
      <PageHeader title="Log a trip" subtitle="Record what you just bought" />

      <LogEntryLoader today={await todayForForms()} />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent trips</h2>
        <RecentTripsLoader />
      </section>
    </>
  );
}
