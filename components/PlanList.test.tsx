import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlanList from "./PlanList";
import type { PlanItem } from "@/lib/plan";

vi.mock("@/app/(app)/plan/actions", () => ({
  togglePlanItemAction: vi.fn(),
  removePlanItemAction: vi.fn(),
  updatePlanQuantityAction: vi.fn(),
}));

const item = (over: Partial<PlanItem> = {}): PlanItem => ({
  id: "p1",
  itemId: "i1",
  name: "Rice",
  quantity: 5,
  unit: "kg",
  source: "predicted",
  checked: false,
  ...over,
});

function renderList(items: PlanItem[]) {
  return render(<PlanList items={items} month="2026-09" />);
}

describe("PlanList", () => {
  it("shows each item with its quantity", () => {
    renderList([item()]);

    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("5 kg")).toBeInTheDocument();
  });

  it("exposes the tick control as a checkbox with its state", () => {
    renderList([item()]);

    const checkbox = screen.getByRole("checkbox", { name: "Tick off Rice" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("flips the label and state once ticked", () => {
    renderList([item({ checked: true })]);

    const checkbox = screen.getByRole("checkbox", { name: "Untick Rice" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("strikes through an item that has been ticked off", () => {
    renderList([item({ checked: true })]);
    expect(screen.getByText("Rice")).toHaveClass("line-through");
  });

  it("marks hand-added items so predictions are distinguishable", () => {
    renderList([item({ source: "manual" })]);
    expect(screen.getByText(/added by hand/)).toBeInTheDocument();
  });

  it("does not label predicted items as hand-added", () => {
    renderList([item({ source: "predicted" })]);
    expect(screen.queryByText(/added by hand/)).not.toBeInTheDocument();
  });

  it("makes the quantity editable in place", () => {
    renderList([item()]);

    expect(screen.getByLabelText("Quantity of Rice")).toHaveValue(5);
  });

  it("carries the month through every control", () => {
    const { container } = renderList([item()]);

    const monthInputs = container.querySelectorAll('input[name="month"]');
    expect(monthInputs.length).toBeGreaterThanOrEqual(3);
    for (const input of monthInputs) {
      expect(input).toHaveValue("2026-09");
    }
  });

  it("sends the opposite checked value so the tick toggles", () => {
    const { container } = renderList([item({ checked: false })]);
    expect(container.querySelector('input[name="checked"]')).toHaveValue("true");
  });

  it("gives every item a distinct remove control", () => {
    renderList([item({ id: "a", name: "Rice" }), item({ id: "b", name: "Milk" })]);

    expect(
      screen.getByRole("button", { name: "Remove Rice from the list" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Milk from the list" }),
    ).toBeInTheDocument();
  });
});
