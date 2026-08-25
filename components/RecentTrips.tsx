import { Trash2Icon } from "lucide-react";
import { deleteTripAction } from "@/app/(app)/log/actions";
import { formatMoney } from "@/lib/money";
import type { RecentTrip } from "@/lib/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatTripDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function RecentTrips({ trips }: { trips: RecentTrip[] }) {
  if (trips.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing logged yet. The first trip you save shows up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {trips.map((trip) => (
        <li key={trip.id}>
          <Card className="py-0 shadow-none">
            <CardContent className="flex items-center gap-3 px-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {formatTripDate(trip.shoppedAt)}
                  {trip.store ? ` · ${trip.store}` : ""}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {trip.itemCount} item{trip.itemCount === 1 ? "" : "s"}
                  {trip.shopper ? ` · ${trip.shopper}` : ""}
                </span>
              </div>

              <span className="shrink-0 font-semibold tabular-nums">
                {formatMoney(trip.total)}
              </span>

              {/* A plain form, so deleting works without client JS and needs
                  no confirm() dialog. */}
              <form action={deleteTripAction}>
                <input type="hidden" name="tripId" value={trip.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  aria-label={`Delete trip on ${formatTripDate(trip.shoppedAt)}`}
                  className="size-11 shrink-0 text-muted-foreground"
                >
                  <Trash2Icon />
                </Button>
              </form>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
