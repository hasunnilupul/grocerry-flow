"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { saveTripAction, type SaveTripState } from "@/app/(app)/log/actions";
import type { CatalogItem } from "@/lib/trips";
import { formatMoney, parseMoney } from "@/lib/money";
import { normalizeItemName } from "@/lib/items";
import { UNITS } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

/** shadcn's controls are sized for pointer input — the default button is 32px
 *  tall. This app is used one-handed in a shop, so every interactive control
 *  is lifted to a 48px touch target. */
const FIELD = "h-12 w-full";
const SELECT_TRIGGER = "h-12 w-full data-[size=default]:h-12";

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
    <form action={formAction} className="@container flex flex-col gap-4">
      {/* Flex children default to min-width:auto, so they refuse to shrink
          below a control's intrinsic width — ~20 characters for a text input,
          more for a date picker. Every flex child holding a control therefore
          needs min-w-0, or the row overflows the phone screen instead of
          dividing it.

          Date and Store only share a row once there is genuinely space for
          two. A date input needs ~150px before the browser starts clipping
          its own picker — which it does without reporting any overflow, so
          only looking at the rendered page catches it. Container queries, not
          viewport breakpoints: what matters is the width this form actually
          has, and it is capped at max-w-md regardless of screen size. */}
      <div className="flex flex-col gap-3 @min-[24rem]:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="shoppedAt">Date</Label>
          <Input
            id="shoppedAt"
            name="shoppedAt"
            type="date"
            required
            defaultValue={today}
            max={today}
            className={FIELD}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="store" className="truncate">
            Store{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="store"
            name="store"
            type="text"
            list="store-options"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="next"
            className={FIELD}
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
          <li key={row.key}>
            <Card className="py-0 shadow-none">
              <CardContent className="flex flex-col gap-2 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Input
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
                    className="h-12 min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeRow(row.key)}
                    aria-label={`Remove item ${index + 1}`}
                    className="size-11 shrink-0 text-muted-foreground"
                  >
                    <XIcon />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {/* Qty and Unit take just what they need; Price takes the
                      rest and is the one allowed to shrink. */}
                  <div className="flex w-[4.5rem] shrink-0 flex-col gap-1">
                    <Label
                      htmlFor={`quantity-${row.key}`}
                      className="text-xs text-muted-foreground"
                    >
                      Qty
                    </Label>
                    <Input
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
                      className="h-12 w-full px-2 text-center"
                    />
                  </div>

                  <div className="flex w-20 shrink-0 flex-col gap-1">
                    <Label
                      htmlFor={`unit-${row.key}`}
                      className="text-xs text-muted-foreground"
                    >
                      Unit
                    </Label>
                    {/* `name` makes Base UI emit a hidden input, so the unit
                        still arrives in FormData alongside the other fields. */}
                    <Select
                      name="unit"
                      value={row.unit}
                      onValueChange={(value: string | null) => {
                        // Base UI can report a cleared selection; a row always
                        // needs some unit, so keep the current one.
                        if (value === null) return;
                        updateRow(row.key, { unit: value, unitTouched: true });
                      }}
                    >
                      <SelectTrigger
                        id={`unit-${row.key}`}
                        className={SELECT_TRIGGER}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Label
                      htmlFor={`price-${row.key}`}
                      className="text-xs text-muted-foreground"
                    >
                      Price
                    </Label>
                    <Input
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
                      className={FIELD}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="h-12 border-dashed text-primary"
      >
        <PlusIcon />
        Add item
      </Button>

      <p aria-live="polite" className="min-h-5 text-sm text-warning">
        {state.error}
      </p>

      {/* Sits above the fixed bottom nav so saving is always one tap away. */}
      <Card className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] py-0">
        <CardContent className="flex items-center gap-3 px-3 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">
              {filledRows} item{filledRows === 1 ? "" : "s"}
            </span>
            <span className="truncate text-lg font-semibold tabular-nums">
              {runningTotal === null ? "No prices" : formatMoney(runningTotal)}
            </span>
          </div>
          <Button type="submit" disabled={pending} className="h-12 shrink-0 px-5">
            {pending ? "Saving…" : "Save trip"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
