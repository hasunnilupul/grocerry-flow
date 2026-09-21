import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportReceiptForm from "./ImportReceiptForm";

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

/** The real thing pulls in ~13MB of WASM and needs a canvas, neither of which
 *  jsdom has. What this component is responsible for is the steps around it,
 *  so the reader itself is stubbed. */
const extractReceiptText = vi.hoisted(() => vi.fn());
vi.mock("@/lib/receipt-ocr", () => ({ extractReceiptText }));

const RECEIPT_TEXT = `
Bill Date : 11-Aug-2026
Billed Store : Keells - Thihariya
 1   118281   KEELLS BAR SOAP 650G    1.0     445.00    445.00
 46  923004   BANANA - AMBUN          0.610   700.00    427.00
Total Net Amount                                      872.00
`;

const CATALOG = [{ id: "1", name: "Rice", defaultUnit: "kg" }];

beforeEach(() => {
  actionState.error = null;
  actionState.pending = false;
  extractReceiptText.mockReset();
});

function renderImport() {
  return render(
    <ImportReceiptForm today="2026-08-25" catalog={CATALOG} stores={["Keells"]} />,
  );
}

function receiptFile(name = "receipt.pdf", type = "application/pdf") {
  return new File(["not really a pdf"], name, { type });
}

/** The file input is visually hidden and driven by a button, so tests upload
 *  to it directly rather than clicking through. */
function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("ImportReceiptForm", () => {
  it("offers to scan before anything is picked", () => {
    renderImport();

    expect(
      screen.getByRole("button", { name: "Choose a receipt" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Item 1")).not.toBeInTheDocument();
  });

  it("hands the scanned rows to the trip form to be checked over", async () => {
    const user = userEvent.setup();
    extractReceiptText.mockResolvedValue(RECEIPT_TEXT);
    const { container } = renderImport();

    await user.upload(fileInput(container), receiptFile());

    expect(await screen.findByLabelText("Item 1")).toHaveValue(
      "KEELLS BAR SOAP 650G",
    );
    expect(screen.getByLabelText("Item 2")).toHaveValue("BANANA - AMBUN");

    // The date and store the receipt named, not today's defaults.
    expect(screen.getByLabelText("Date")).toHaveValue("2026-08-11");
    expect(screen.getByLabelText(/Store/)).toHaveValue("Keells - Thihariya");

    // Nothing is saved by scanning — the trip's own save button still is.
    expect(
      screen.getByRole("button", { name: "Save trip" }),
    ).toBeInTheDocument();
  });

  it("reports progress while the scan runs", async () => {
    const user = userEvent.setup();
    extractReceiptText.mockImplementation(
      async (_file: File, onProgress: (p: unknown) => void) => {
        onProgress({
          stage: "recognizing",
          page: 2,
          pageCount: 3,
          progress: 0.5,
        });
        return RECEIPT_TEXT;
      },
    );
    const { container } = renderImport();

    await user.upload(fileInput(container), receiptFile());

    await waitFor(() =>
      expect(screen.getByLabelText("Item 1")).toBeInTheDocument(),
    );
    expect(extractReceiptText).toHaveBeenCalledOnce();
  });

  it("says so when the receipt held no items, and offers another go", async () => {
    const user = userEvent.setup();
    extractReceiptText.mockResolvedValue("thanks for shopping with us");
    const { container } = renderImport();

    await user.upload(fileInput(container), receiptFile());

    expect(await screen.findByText(/Couldn't find any items/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try another file" }),
    ).toBeInTheDocument();
  });

  it("surfaces a reader failure without losing the manual way in", async () => {
    const user = userEvent.setup();
    extractReceiptText.mockRejectedValue(new Error("Couldn't open that PDF."));
    const { container } = renderImport();

    await user.upload(fileInput(container), receiptFile());

    expect(await screen.findByText("Couldn't open that PDF.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Type it in instead" }));

    expect(screen.getByLabelText("Item 1")).toHaveValue("");
  });

  it("goes back to the picker when the scan is started over", async () => {
    const user = userEvent.setup();
    extractReceiptText.mockResolvedValue(RECEIPT_TEXT);
    const { container } = renderImport();

    await user.upload(fileInput(container), receiptFile());
    expect(await screen.findByLabelText("Item 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(
      screen.getByRole("button", { name: "Choose a receipt" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Item 1")).not.toBeInTheDocument();
  });
});
