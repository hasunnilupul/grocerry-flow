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

function renderForm(
  props: Partial<React.ComponentProps<typeof TripForm>> = {},
) {
  actionState.error = actionState.error ?? null;
  return render(
    <TripForm
      today="2026-08-25"
      catalog={CATALOG}
      stores={["Keells"]}
      {...props}
    />,
  );
}

/** The unit control is a Base UI Select, not a native <select>. It submits
 *  through a hidden input, so assert on that — it is the value the server
 *  action actually receives. */
function unitValues(container: HTMLElement): string[] {
  return [...container.querySelectorAll('input[name="unit"]')].map(
    (input) => (input as HTMLInputElement).value,
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

    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByLabelText("Item 2")).toBeInTheDocument();
  });

  it("removes a row, but always leaves one to type into", async () => {
    reset();
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.click(screen.getByRole("button", { name: "Remove item 2" }));
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove item 1" }));
    expect(screen.getByLabelText("Item 1")).toBeInTheDocument();
  });

  it("adopts the unit a known item is usually bought in", async () => {
    reset();
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.type(screen.getByLabelText("Item 1"), "Rice");

    expect(unitValues(container)).toEqual(["kg"]);
    expect(screen.getByRole("combobox", { name: "Unit" })).toHaveTextContent(
      "kg",
    );
  });

  it("leaves the unit alone for an unknown item", async () => {
    reset();
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.type(screen.getByLabelText("Item 1"), "Saffron");

    expect(unitValues(container)).toEqual(["pcs"]);
  });

  it("does not overwrite a unit the user chose themselves", async () => {
    reset();
    const user = userEvent.setup();
    const { container } = renderForm();

    // `name` disambiguates: an <input list=...> also reports role combobox.
    await user.click(screen.getByRole("combobox", { name: "Unit" }));
    await user.click(await screen.findByRole("option", { name: "g" }));
    expect(unitValues(container)).toEqual(["g"]);

    await user.type(screen.getByLabelText("Item 1"), "Rice");

    // "Rice" is a kg item in the catalogue, but the shopper already said g.
    expect(unitValues(container)).toEqual(["g"]);
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

    await user.click(screen.getByRole("button", { name: "Add item" }));
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

/** The review step of a scanned receipt is this same form, opened on the rows
 *  the scan produced rather than on one blank row. */
describe("TripForm opened on scanned rows", () => {
  const SCANNED = [
    { name: "KEELLS BAR SOAP 650G", quantity: 1, unit: "pcs", totalPrice: 445 },
    { name: "BANANA - AMBUN", quantity: 0.61, unit: "kg", totalPrice: 427 },
  ];

  it("fills a row per scanned item, priced and measured as read", () => {
    reset();
    const { container } = renderForm({ initialRows: SCANNED });

    expect(screen.getByLabelText("Item 1")).toHaveValue("KEELLS BAR SOAP 650G");
    expect(screen.getByLabelText("Item 2")).toHaveValue("BANANA - AMBUN");
    expect(unitValues(container)).toEqual(["pcs", "kg"]);

    const quantities = screen.getAllByLabelText("Qty");
    expect(quantities[0]).toHaveValue(1);
    expect(quantities[1]).toHaveValue(0.61);

    const prices = screen.getAllByLabelText("Price");
    expect(prices[0]).toHaveValue("445");
    expect(prices[1]).toHaveValue("427");
  });

  it("leaves an unpriced row's price empty rather than zero", () => {
    reset();
    renderForm({
      initialRows: [
        { name: "KEELLS RED DHAL 500G", quantity: 1, unit: "pcs", totalPrice: null },
      ],
    });

    expect(screen.getByLabelText("Price")).toHaveValue("");
  });

  it("opens on the date and store read off the receipt", () => {
    reset();
    renderForm({
      initialRows: SCANNED,
      initialStore: "Keells - Thihariya",
      initialShoppedAt: "2026-08-11",
    });

    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText(/Store/)).toHaveValue("Keells - Thihariya");
  });

  it("ignores a scanned date in the future, which the field would reject", () => {
    reset();
    renderForm({ initialRows: SCANNED, initialShoppedAt: "2027-01-02" });

    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-25");
  });

  it("still opens on one blank row when the scan found nothing", () => {
    reset();
    renderForm({ initialRows: [] });

    expect(screen.getByLabelText("Item 1")).toHaveValue("");
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();
  });

  it("keeps a scanned unit when the item name is edited", async () => {
    reset();
    const user = userEvent.setup();
    const { container } = renderForm({
      // "Rice" is a kg item in the catalogue; the receipt said pcs, and the
      // receipt is the better evidence here.
      initialRows: [
        { name: "Ric", quantity: 2, unit: "pcs", totalPrice: 1250 },
      ],
    });

    await user.type(screen.getByLabelText("Item 1"), "e");

    expect(screen.getByLabelText("Item 1")).toHaveValue("Rice");
    expect(unitValues(container)).toEqual(["pcs"]);
  });
});
