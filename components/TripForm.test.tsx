import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TripForm from "./TripForm";

const actionState = vi.hoisted(() => ({
  error: null as string | null,
  pending: false,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      { error: actionState.error },
      vi.fn(),
      actionState.pending,
    ],
  };
});

vi.mock("@/app/(app)/log/actions", () => ({ saveTripAction: vi.fn() }));

const CATALOG = [
  { id: "1", name: "Rice", defaultUnit: "kg" },
  { id: "2", name: "Milk", defaultUnit: "L" },
];

function renderForm() {
  actionState.error = actionState.error ?? null;
  return render(
    <TripForm today="2026-08-25" catalog={CATALOG} stores={["Keells"]} />,
  );
}

function reset() {
  actionState.error = null;
  actionState.pending = false;
}

describe("TripForm", () => {
  it("starts with today's date and a single empty row", () => {
    reset();
    renderForm();

    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-25");
    expect(screen.getByLabelText("Item 1")).toHaveValue("");
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();
  });

  it("does not allow a future trip date", () => {
    reset();
    renderForm();

    expect(screen.getByLabelText("Date")).toHaveAttribute("max", "2026-08-25");
  });

  it("adds a row when Add item is tapped", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "+ Add item" }));

    expect(screen.getByLabelText("Item 2")).toBeInTheDocument();
  });

  it("removes a row, but always leaves one to type into", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "+ Add item" }));
    await user.click(screen.getByRole("button", { name: "Remove item 2" }));
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove item 1" }));
    expect(screen.getByLabelText("Item 1")).toBeInTheDocument();
  });

  it("adopts the unit a known item is usually bought in", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Item 1"), "Rice");

    expect(screen.getByLabelText("Unit")).toHaveValue("kg");
  });

  it("leaves the unit alone for an unknown item", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Item 1"), "Saffron");

    expect(screen.getByLabelText("Unit")).toHaveValue("pcs");
  });

  it("does not overwrite a unit the user chose themselves", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Unit"), "g");
    await user.type(screen.getByLabelText("Item 1"), "Rice");

    expect(screen.getByLabelText("Unit")).toHaveValue("g");
  });

  it("shows a running total as prices are typed", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText("No prices")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Item 1"), "Rice");
    await user.type(screen.getByLabelText("Price"), "1250.50");

    expect(screen.getByText(/1,?250\.50/)).toBeInTheDocument();
  });

  it("counts only rows that have an item name", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText("0 items")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Item 1"), "Rice");
    expect(screen.getByText("1 item")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Add item" }));
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("offers known items and stores as suggestions", () => {
    reset();
    const { container } = renderForm();

    const itemOptions = container.querySelectorAll("#item-options option");
    expect([...itemOptions].map((option) => option.getAttribute("value"))).toEqual([
      "Rice",
      "Milk",
    ]);

    const storeOptions = container.querySelectorAll("#store-options option");
    expect([...storeOptions].map((option) => option.getAttribute("value"))).toEqual([
      "Keells",
    ]);
  });

  it("announces the error the action returned", () => {
    reset();
    actionState.error = "Add at least one item before saving.";
    renderForm();

    expect(
      screen.getByText("Add at least one item before saving."),
    ).toBeInTheDocument();
  });

  it("disables the save button while saving", () => {
    reset();
    actionState.pending = true;
    renderForm();

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
