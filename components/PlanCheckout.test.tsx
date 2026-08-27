import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddPlanItem, PlanCheckout } from "./PlanCheckout";

const actionState = vi.hoisted(() => ({
  error: null as string | null,
  notice: null as string | null,
  pending: false,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      { error: actionState.error, notice: actionState.notice },
      vi.fn(),
      actionState.pending,
    ],
  };
});

vi.mock("@/app/(app)/plan/actions", () => ({
  addPlanItemAction: vi.fn(),
  checkoutPlanAction: vi.fn(),
}));

function reset() {
  actionState.error = null;
  actionState.notice = null;
  actionState.pending = false;
}

describe("AddPlanItem", () => {
  it("offers name, quantity and unit fields", () => {
    reset();
    const { container } = render(
      <AddPlanItem month="2026-09" itemNames={["Rice"]} />,
    );

    expect(screen.getByLabelText("Item to add")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity to add")).toHaveValue(1);

    // The unit is a Base UI Select; it submits via a hidden input.
    expect(screen.getByRole("combobox", { name: "Unit to add" })).toHaveTextContent(
      "pcs",
    );
    expect(
      (container.querySelector('input[name="unit"]') as HTMLInputElement).value,
    ).toBe("pcs");
  });

  it("suggests items already in the catalogue", () => {
    reset();
    const { container } = render(
      <AddPlanItem month="2026-09" itemNames={["Rice", "Milk"]} />,
    );

    expect(
      container.querySelectorAll("#plan-item-options option"),
    ).toHaveLength(2);
  });

  it("announces a validation error", () => {
    reset();
    actionState.error = "Give the item a name.";
    render(<AddPlanItem month="2026-09" itemNames={[]} />);

    expect(screen.getByText("Give the item a name.")).toBeInTheDocument();
  });
});

describe("PlanCheckout", () => {
  it("shows how much of the list is ticked off", () => {
    reset();
    render(
      <PlanCheckout month="2026-09" checkedCount={3} totalCount={8} checkedTotal={null} stores={[]} />,
    );

    expect(screen.getByText("3 of 8 ticked")).toBeInTheDocument();
  });

  it("totals the prices entered against ticked items", () => {
    reset();
    render(
      <PlanCheckout
        month="2026-09"
        checkedCount={2}
        totalCount={5}
        checkedTotal={1730.5}
        stores={[]}
      />,
    );

    expect(screen.getByText(/1,?730\.50/)).toBeInTheDocument();
  });

  it("distinguishes nothing ticked from nothing priced", () => {
    reset();
    render(
      <PlanCheckout
        month="2026-09"
        checkedCount={0}
        totalCount={5}
        checkedTotal={null}
        stores={[]}
      />,
    );

    // A price may well be typed against an unticked row; saying "No prices"
    // there would be describing the wrong thing.
    expect(screen.getByText("Nothing ticked")).toBeInTheDocument();
  });

  it("says so when ticked items have no prices, rather than showing zero", () => {
    reset();
    render(
      <PlanCheckout
        month="2026-09"
        checkedCount={2}
        totalCount={5}
        checkedTotal={null}
        stores={[]}
      />,
    );

    expect(screen.getByText("No prices")).toBeInTheDocument();
  });

  it("cannot save a trip with nothing ticked", () => {
    reset();
    render(
      <PlanCheckout month="2026-09" checkedCount={0} totalCount={8} checkedTotal={null} stores={[]} />,
    );

    expect(screen.getByRole("button", { name: "Save trip" })).toBeDisabled();
  });

  it("enables saving once something is ticked", () => {
    reset();
    render(
      <PlanCheckout month="2026-09" checkedCount={1} totalCount={8} checkedTotal={null} stores={[]} />,
    );

    expect(screen.getByRole("button", { name: "Save trip" })).toBeEnabled();
  });

  it("suggests stores already shopped at", () => {
    reset();
    const { container } = render(
      <PlanCheckout
        month="2026-09"
        checkedCount={1}
        totalCount={2} checkedTotal={null}
        stores={["Keells"]}
      />,
    );

    expect(
      container.querySelectorAll("#plan-store-options option"),
    ).toHaveLength(1);
  });

  it("reports what was saved", () => {
    reset();
    actionState.notice = "Saved 3 items as a trip. Add prices from the Log tab.";
    render(
      <PlanCheckout month="2026-09" checkedCount={0} totalCount={3} checkedTotal={null} stores={[]} />,
    );

    expect(screen.getByText(/Saved 3 items as a trip/)).toBeInTheDocument();
  });

  it("disables the button while saving", () => {
    reset();
    actionState.pending = true;
    render(
      <PlanCheckout month="2026-09" checkedCount={2} totalCount={3} checkedTotal={null} stores={[]} />,
    );

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
