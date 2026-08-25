import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemList, MonthNav, SpendHeadline } from "./MonthSummaryView";
import type { ItemSummary } from "@/lib/summary";

describe("MonthNav", () => {
  it("links back to the previous month", () => {
    render(<MonthNav month="2026-08" latestMonth="2026-08" />);

    expect(
      screen.getByRole("link", { name: "Go to July 2026" }),
    ).toHaveAttribute("href", "/?m=2026-07");
  });

  it("hides the forward arrow on the latest month", () => {
    render(<MonthNav month="2026-08" latestMonth="2026-08" />);

    expect(
      screen.queryByRole("link", { name: /Go to September/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the forward arrow when there is a later month", () => {
    render(<MonthNav month="2026-06" latestMonth="2026-08" />);

    expect(
      screen.getByRole("link", { name: "Go to July 2026" }),
    ).toHaveAttribute("href", "/?m=2026-07");
  });

  it("crosses a year boundary backwards", () => {
    render(<MonthNav month="2026-01" latestMonth="2026-08" />);

    expect(
      screen.getByRole("link", { name: "Go to December 2025" }),
    ).toHaveAttribute("href", "/?m=2025-12");
  });

  it("names the month being viewed", () => {
    render(<MonthNav month="2026-08" latestMonth="2026-08" />);
    expect(screen.getByText("August 2026")).toBeInTheDocument();
  });
});

describe("SpendHeadline", () => {
  it("shows the total and trip count", () => {
    render(
      <SpendHeadline total={4200} previousTotal={null} tripCount={3} />,
    );

    expect(screen.getByText(/4,?200\.00/)).toBeInTheDocument();
    expect(screen.getByText(/3 trips/)).toBeInTheDocument();
  });

  it("uses the singular for one trip", () => {
    render(<SpendHeadline total={100} previousTotal={null} tripCount={1} />);
    expect(screen.getByText(/1 trip$/)).toBeInTheDocument();
  });

  it("shows a signed increase against last month", () => {
    render(<SpendHeadline total={150} previousTotal={100} tripCount={2} />);
    expect(screen.getByText("+50% vs last month")).toBeInTheDocument();
  });

  it("shows a decrease without a plus sign", () => {
    render(<SpendHeadline total={80} previousTotal={100} tripCount={2} />);
    expect(screen.getByText("-20% vs last month")).toBeInTheDocument();
  });

  it("omits the comparison when there is no previous month", () => {
    render(<SpendHeadline total={150} previousTotal={null} tripCount={2} />);
    expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
  });

  it("shows a dash when no prices were recorded", () => {
    render(<SpendHeadline total={null} previousTotal={null} tripCount={2} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ItemList", () => {
  const item = (over: Partial<ItemSummary> = {}): ItemSummary => ({
    name: "Rice",
    quantities: [{ quantity: 5, unit: "kg" }],
    total: 1250,
    ...over,
  });

  it("shows an empty state with a way to start", () => {
    render(<ItemList items={[]} />);

    expect(screen.getByRole("link", { name: "Log a trip" })).toHaveAttribute(
      "href",
      "/log",
    );
  });

  it("lists each item with its quantity and spend", () => {
    render(<ItemList items={[item()]} />);

    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("5 kg")).toBeInTheDocument();
    expect(screen.getByText(/1,?250\.00/)).toBeInTheDocument();
  });

  it("joins incompatible measures rather than adding them", () => {
    render(
      <ItemList
        items={[
          item({
            quantities: [
              { quantity: 2, unit: "kg" },
              { quantity: 3, unit: "pcs" },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("2 kg + 3 pcs")).toBeInTheDocument();
  });

  it("shows a dash for an item with no price recorded", () => {
    render(<ItemList items={[item({ total: null })]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
