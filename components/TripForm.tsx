"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { saveTripAction, type SaveTripState } from "@/app/(app)/log/actions";
import type { CatalogItem } from "@/lib/trips";
import { formatMoney, parseMoney } from "@/lib/money";
import { normalizeItemName } from "@/lib/items";
import { UNITS } from "@/lib/units";

type Row = {
  key: number;
  name: string;
  quantity: string;
  unit: string;
  price: string;
  /** Set once the shopper picks a unit by hand, which stops the catalogue
   *  from overwriting their choice as they keep typing the item name. */
  unitTouched: boolean;
};

const INITIAL_STATE: SaveTripState = { error: null };

let nextKey = 0;
function blankRow(): Row {
  return {
    key: nextKey++,
    name: "",
    quantity: "1",
    unit: "pcs",
    price: "",
    unitTouched: false,
  };
}

export default function TripForm({
  today,
  catalog,
  stores,
}: {
  today: string;
  catalog: CatalogItem[];
  stores: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveTripAction,
    INITIAL_STATE,
  );
  const [rows, setRows] = useState<Row[]>(() => [blankRow()]);
  const lastNameInput = useRef<HTMLInputElement | null>(null);

  // Look-up from normalized name to the unit that item is usually bought in.
  const unitByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of catalog) {
      map.set(normalizeItemName(item.name), item.defaultUnit);
    }
    return map;
  }, [catalog]);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  /** Typing a known item switches the unit to whatever it's normally bought
   *  in — but never once the shopper has chosen a unit themselves, so an
   *  explicit "500 g of rice" survives finishing the word "rice". */
  function handleNameChange(row: Row, name: string) {
    const remembered = unitByName.get(normalizeItemName(name));
    const patch: Partial<Row> = { name };
    if (remembered && !row.unitTouched) {
      patch.unit = remembered;
    }
    updateRow(row.key, patch);
  }

  function addRow() {
    setRows((current) => [...current, blankRow()]);
    // Focus lands on the new row once it exists in the DOM.
    requestAnimationFrame(() => lastNameInput.current?.focus());
  }

  function removeRow(key: number) {
    setRows((current) =>
      current.length === 1 ? [blankRow()] : current.filter((r) => r.key !== key),
    );
  }

  const runningTotal = useMemo(() => {
    const amounts = rows
      .map((row) => parseMoney(row.price))
      .filter((value): value is number => value !== null);
    return amounts.length
      ? Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100
      : null;
  }, [rows]);

  const filledRows = rows.filter((row) => row.name.trim()).length;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="shoppedAt" className="text-sm font-medium">
            Date
          </label>
          <input
            id="shoppedAt"
            name="shoppedAt"
            type="date"
            required
            defaultValue={today}
            max={today}
            className="min-h-12 rounded-xl border border-line bg-surface px-3"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="store" className="text-sm font-medium">
            Store <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="store"
            name="store"
            type="text"
            list="store-options"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="next"
            className="min-h-12 rounded-xl border border-line bg-surface px-3"
          />
          <datalist id="store-options">
            {stores.map((store) => (
              <option key={store} value={store} />
            ))}
          </datalist>
        </div>
      </div>

      <datalist id="item-options">
        {catalog.map((item) => (
          <option key={item.id} value={item.name} />
        ))}
      </datalist>

      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <input
                ref={index === rows.length - 1 ? lastNameInput : null}
                aria-label={`Item ${index + 1}`}
                name="itemName"
                type="text"
                list="item-options"
                placeholder="Item name"
                maxLength={80}
                autoComplete="off"
                enterKeyHint="next"
                value={row.name}
                onChange={(event) => handleNameChange(row, event.target.value)}
                className="min-h-12 flex-1 rounded-xl border border-line bg-bg px-3"
              />
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label={`Remove item ${index + 1}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l8 8M14 6l-8 8" />
                </svg>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex w-20 flex-col gap-1">
                <label
                  htmlFor={`quantity-${row.key}`}
                  className="text-xs text-muted"
                >
                  Qty
                </label>
                <input
                  id={`quantity-${row.key}`}
                  name="quantity"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={row.quantity}
                  onChange={(event) =>
                    updateRow(row.key, { quantity: event.target.value })
                  }
                  className="min-h-12 rounded-xl border border-line bg-bg px-3"
                />
              </div>

              <div className="flex w-24 flex-col gap-1">
                <label htmlFor={`unit-${row.key}`} className="text-xs text-muted">
                  Unit
                </label>
                <select
                  id={`unit-${row.key}`}
                  name="unit"
                  value={row.unit}
                  onChange={(event) =>
                    updateRow(row.key, {
                      unit: event.target.value,
                      unitTouched: true,
                    })
                  }
                  className="min-h-12 rounded-xl border border-line bg-bg px-2"
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <label
                  htmlFor={`price-${row.key}`}
                  className="text-xs text-muted"
                >
                  Price
                </label>
                <input
                  id={`price-${row.key}`}
                  name="price"
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  enterKeyHint={index === rows.length - 1 ? "done" : "next"}
                  value={row.price}
                  onChange={(event) =>
                    updateRow(row.key, { price: event.target.value })
                  }
                  className="min-h-12 rounded-xl border border-line bg-bg px-3"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="min-h-12 rounded-xl border border-dashed border-line font-medium text-accent"
      >
        + Add item
      </button>

      <p aria-live="polite" className="min-h-5 text-sm text-warning">
        {state.error}
      </p>

      {/* Sits above the fixed bottom nav so saving is always one tap away. */}
      <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-muted">
            {filledRows} item{filledRows === 1 ? "" : "s"}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {runningTotal === null ? "No prices" : formatMoney(runningTotal)}
          </span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-accent px-6 font-semibold text-on-accent disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save trip"}
        </button>
      </div>
    </form>
  );
}
