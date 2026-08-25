import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import RecentTrips from "@/components/RecentTrips";
import TripForm from "@/components/TripForm";
import { todayIsoDate } from "@/lib/month";
import { listCatalogItems, listRecentTrips, listStores } from "@/lib/trips";

export const dynamic = "force-dynamic";

async function TripFormLoader() {
  // Both feed the form's suggestions; nothing depends on the other.
  const [catalog, stores] = await Promise.all([
    listCatalogItems(),
    listStores(),
  ]);

  return (
    <TripForm today={todayIsoDate()} catalog={catalog} stores={stores} />
  );
}

async function RecentTripsLoader() {
  const trips = await listRecentTrips(5);
  return <RecentTrips trips={trips} />;
}

export default function LogPage() {
  return (
    <>
      <PageHeader title="Log a trip" subtitle="Record what you just bought" />

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}
      >
        <TripFormLoader />
      </Suspense>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent trips</h2>
        <Suspense
          fallback={<div className="h-24 animate-pulse rounded-2xl bg-card" />}
        >
          <RecentTripsLoader />
        </Suspense>
      </section>
    </>
  );
}
