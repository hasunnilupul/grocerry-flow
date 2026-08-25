import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SpendChart from "./SpendChart";
import type { MonthTotal } from "@/lib/summary";

const month = (key: string, total: number | null): MonthTotal => ({
  month: key,
  total,
  tripCount: 1,
});

describe("SpendChart", () => {
  it("draws nothing until there are two priced months to compare", () => {
    const { container } = render(
      <SpendChart months={[month("2026-08", 100)]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("draws nothing when no month has prices", () => {
    const { container } = render(
      <SpendChart months={[month("2026-07", null), month("2026-08", null)]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("labels the chart with the range it covers", () => {
    render(
      <SpendChart months={[month("2026-06", 100), month("2026-08", 300)]} />,
    );

    expect(
      screen.getByRole("img", {
        name: "Monthly spend from June 2026 to August 2026",
      }),
    ).toBeInTheDocument();
  });

  it("draws one column per month", () => {
    const { container } = render(
      <SpendChart
        months={[
          month("2026-06", 100),
          month("2026-07", 200),
          month("2026-08", 300),
        ]}
      />,
    );

    // Each month contributes a rounded body plus a squared foot.
    expect(container.querySelectorAll("rect")).toHaveLength(6);
  });

  it("gives every column a tooltip naming its month and amount", () => {
    const { container } = render(
      <SpendChart months={[month("2026-07", 100), month("2026-08", 250)]} />,
    );

    const titles = [...container.querySelectorAll("title")].map(
      (node) => node.textContent,
    );
    expect(titles[0]).toMatch(/^July 2026: /);
    expect(titles[1]).toMatch(/^August 2026: /);
    expect(titles[1]).toMatch(/250\.00/);
  });

  it("direct-labels only the tallest column", () => {
    const { container } = render(
      <SpendChart
        months={[
          month("2026-06", 100),
          month("2026-07", 900),
          month("2026-08", 300),
        ]}
      />,
    );

    const labels = [...container.querySelectorAll("text")].map(
      (node) => node.textContent,
    );
    const valueLabels = labels.filter((label) => label?.match(/\d{3}\.00/));
    expect(valueLabels).toHaveLength(1);
    expect(valueLabels[0]).toMatch(/900\.00/);
  });

  it("scales columns against the peak, not against each other", () => {
    const { container } = render(
      <SpendChart months={[month("2026-07", 100), month("2026-08", 200)]} />,
    );

    const bodies = [...container.querySelectorAll("rect[rx]")];
    const heights = bodies.map((node) => Number(node.getAttribute("height")));
    // The 200 column is twice the 100 column.
    expect(heights[1] / heights[0]).toBeCloseTo(2, 1);
  });

  it("treats a month with no prices as zero height rather than crashing", () => {
    const { container } = render(
      <SpendChart
        months={[
          month("2026-06", 100),
          month("2026-07", null),
          month("2026-08", 200),
        ]}
      />,
    );

    // The unpriced month draws no body.
    expect(container.querySelectorAll("rect[rx]")).toHaveLength(2);
  });

  it("dims the months that are not the highlighted one", () => {
    const { container } = render(
      <SpendChart
        months={[month("2026-07", 100), month("2026-08", 200)]}
        highlight="2026-08"
      />,
    );

    const bodies = [...container.querySelectorAll("rect[rx]")];
    expect(bodies[0].getAttribute("opacity")).toBe("0.55");
    expect(bodies[1].getAttribute("opacity")).toBe("1");
  });
});
