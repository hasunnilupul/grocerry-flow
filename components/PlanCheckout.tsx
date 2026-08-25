"use client";

import { useActionState } from "react";
import {
  addPlanItemAction,
  checkoutPlanAction,
  type PlanState,
} from "@/app/(app)/plan/actions";
import { UNITS } from "@/lib/units";

const INITIAL: PlanState = { error: null, notice: null };

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

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="month" value={month} />

      <div className="flex gap-2">
        <input
          name="itemName"
          type="text"
          list="plan-item-options"
          placeholder="Add something else"
          aria-label="Item to add"
          maxLength={80}
          autoComplete="off"
          className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3"
        />
        <datalist id="plan-item-options">
          {itemNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <input
          name="quantity"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          defaultValue="1"
          aria-label="Quantity to add"
          className="min-h-12 w-16 rounded-xl border border-line bg-surface px-2 text-center"
        />

        <select
          name="unit"
          defaultValue="pcs"
          aria-label="Unit to add"
          className="min-h-12 w-20 rounded-xl border border-line bg-surface px-2"
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl border border-dashed border-line font-medium text-accent disabled:opacity-60"
      >
        {pending ? "Adding…" : "+ Add to list"}
      </button>

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
  stores,
}: {
  month: string;
  checkedCount: number;
  totalCount: number;
  stores: string[];
}) {
  const [state, formAction, pending] = useActionState(
    checkoutPlanAction,
    INITIAL,
  );

  return (
    <form
      action={formAction}
      className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3"
    >
      <input type="hidden" name="month" value={month} />

      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-muted">Ticked off</span>
          <span className="text-lg font-semibold tabular-nums">
            {checkedCount} of {totalCount}
          </span>
        </div>

        <input
          name="store"
          type="text"
          list="plan-store-options"
          placeholder="Store"
          aria-label="Store"
          maxLength={80}
          autoComplete="off"
          className="min-h-12 w-28 rounded-xl border border-line bg-bg px-3"
        />
        <datalist id="plan-store-options">
          {stores.map((store) => (
            <option key={store} value={store} />
          ))}
        </datalist>

        <button
          type="submit"
          disabled={pending || checkedCount === 0}
          className="min-h-12 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save trip"}
        </button>
      </div>

      <p aria-live="polite" className="text-sm">
        <span className="text-warning">{state.error}</span>
        <span className="text-muted">{state.notice}</span>
      </p>
    </form>
  );
}
