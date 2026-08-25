import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RecentTrips from "./RecentTrips";
import type { RecentTrip } from "@/lib/trips";

vi.mock("@/app/(app)/log/actions", () => ({ deleteTripAction: vi.fn() }));

const trip = (over: Partial<RecentTrip> = {}): RecentTrip => ({
  id: "t1",
  shoppedAt: "2026-08-25",
  store: "Keells",
  shopper: "Nimal",
  itemCount: 3,
  total: 4200,
  ...over,
});

describe("RecentTrips", () => {
  it("explains the empty state", () => {
    render(<RecentTrips trips={[]} />);

    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it("shows the store, item count and shopper", () => {
    render(<RecentTrips trips={[trip()]} />);

    expect(screen.getByText(/Keells/)).toBeInTheDocument();
    expect(screen.getByText(/3 items · Nimal/)).toBeInTheDocument();
  });

  it("uses the singular for a one-item trip", () => {
    render(<RecentTrips trips={[trip({ itemCount: 1, shopper: null })]} />);

    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("shows a dash when the trip had no prices", () => {
    render(<RecentTrips trips={[trip({ total: null })]} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("omits the store separator when there is no store", () => {
    render(<RecentTrips trips={[trip({ store: null })]} />);

    expect(screen.queryByText(/·\s*Keells/)).not.toBeInTheDocument();
  });

  it("gives each delete button a distinguishable label", () => {
    render(
      <RecentTrips
        trips={[
          trip({ id: "a", shoppedAt: "2026-08-25" }),
          trip({ id: "b", shoppedAt: "2026-08-10" }),
        ]}
      />,
    );

    expect(screen.getAllByRole("button", { name: /^Delete trip on/ })).toHaveLength(
      2,
    );
  });

  it("renders the trip date without shifting the day", () => {
    render(<RecentTrips trips={[trip({ shoppedAt: "2026-01-01" })]} />);

    expect(screen.getByText(/1 Jan|Jan 1/)).toBeInTheDocument();
  });
});
