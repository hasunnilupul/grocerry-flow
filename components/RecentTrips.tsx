import { deleteTripAction } from "@/app/(app)/log/actions";
import { formatMoney } from "@/lib/money";
import type { RecentTrip } from "@/lib/trips";

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
      <p className="text-sm text-muted">
        Nothing logged yet. The first trip you save shows up here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {trips.map((trip) => (
        <li
          key={trip.id}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
        >
          <div className="flex flex-1 flex-col">
            <span className="font-medium">
              {formatTripDate(trip.shoppedAt)}
              {trip.store ? ` · ${trip.store}` : ""}
            </span>
            <span className="text-sm text-muted">
              {trip.itemCount} item{trip.itemCount === 1 ? "" : "s"}
              {trip.shopper ? ` · ${trip.shopper}` : ""}
            </span>
          </div>

          <span className="font-semibold tabular-nums">
            {formatMoney(trip.total)}
          </span>

          {/* A plain form, so deleting works without client JS and needs no
              confirm() dialog. */}
          <form action={deleteTripAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <button
              type="submit"
              aria-label={`Delete trip on ${formatTripDate(trip.shoppedAt)}`}
              className="flex size-11 items-center justify-center rounded-xl text-muted"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 6h12M8 6V4h4v2M7 6l.7 9h4.6L13 6" />
              </svg>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
