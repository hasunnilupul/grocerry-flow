"use client";

import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";
import {
  addPlanItemAction,
  checkoutPlanAction,
  type PlanState,
} from "@/app/(app)/plan/actions";
import { formatMoney } from "@/lib/money";
import { UNITS } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INITIAL: PlanState = { error: null, notice: null };

const SELECT_TRIGGER = "h-12 w-full data-[size=default]:h-12";

export function AddPlanItem({
  month,
  itemNames,
}: {
  month: string;
  itemNames: string[];
}) {
  const [state, formAction, pending] = useActionState(
    addPlanItemAction,
    INITIAL,
  );
  // Base UI's Select is controlled here purely so the trigger shows the value.
  const [unit, setUnit] = useState<string>("pcs");

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="month" value={month} />

      <div className="flex gap-2">
        <Input
          name="itemName"
          type="text"
          list="plan-item-options"
          placeholder="Add something else"
          aria-label="Item to add"
          maxLength={80}
          autoComplete="off"
          className="h-12 min-w-0 flex-1"
        />
        <datalist id="plan-item-options">
          {itemNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <Input
          name="quantity"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          defaultValue="1"
          aria-label="Quantity to add"
          className="h-12 w-16 shrink-0 px-2 text-center"
        />

        <div className="w-20 shrink-0">
          <Select
            name="unit"
            value={unit}
            onValueChange={(value: string | null) => setUnit(value ?? "pcs")}
          >
            <SelectTrigger aria-label="Unit to add" className={SELECT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-12 border-dashed text-primary"
      >
        <PlusIcon />
        {pending ? "Adding…" : "Add to list"}
      </Button>

      <p aria-live="polite" className="text-sm text-warning">
        {state.error}
      </p>
    </form>
  );
}

export function PlanCheckout({
  month,
  checkedCount,
  totalCount,
  checkedTotal,
  stores,
}: {
  month: string;
  checkedCount: number;
  totalCount: number;
  /** Sum of the prices entered against ticked items; null if none were. */
  checkedTotal: number | null;
  stores: string[];
}) {
  const [state, formAction, pending] = useActionState(
    checkoutPlanAction,
    INITIAL,
  );

  return (
    <Card className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] py-0">
      <CardContent className="px-3 py-3">
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="month" value={month} />

          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">
                {checkedCount} of {totalCount} ticked
              </span>
              <span className="truncate text-lg font-semibold tabular-nums">
                {checkedTotal === null ? "No prices" : formatMoney(checkedTotal)}
              </span>
            </div>

            <Input
              name="store"
              type="text"
              list="plan-store-options"
              placeholder="Store"
              aria-label="Store"
              maxLength={80}
              autoComplete="off"
              className="h-12 w-24 shrink-0"
            />
            <datalist id="plan-store-options">
              {stores.map((store) => (
                <option key={store} value={store} />
              ))}
            </datalist>

            <Button
              type="submit"
              disabled={pending || checkedCount === 0}
              className="h-12 shrink-0 px-4"
            >
              {pending ? "Saving…" : "Save trip"}
            </Button>
          </div>

          <p aria-live="polite" className="text-sm">
            <span className="text-warning">{state.error}</span>
            <span className="text-muted-foreground">{state.notice}</span>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
