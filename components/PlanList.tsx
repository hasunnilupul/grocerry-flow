import {
  removePlanItemAction,
  togglePlanItemAction,
  updatePlanQuantityAction,
} from "@/app/(app)/plan/actions";
import type { PlanItem } from "@/lib/plan";
import { formatQuantity } from "@/lib/units";

/** The shopping list itself. Every control is a plain form posting a server
 *  action, so ticking items off works on a bad shop signal and with no client
 *  JavaScript at all. */
export default function PlanList({
  items,
  month,
}: {
  items: PlanItem[];
  month: string;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 px-3 py-2">
          <form action={togglePlanItemAction} className="flex flex-1 items-center gap-3">
            <input type="hidden" name="planItemId" value={item.id} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="checked" value={String(!item.checked)} />

            <button
              type="submit"
              role="checkbox"
              aria-checked={item.checked}
              aria-label={`${item.checked ? "Untick" : "Tick off"} ${item.name}`}
              className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                item.checked
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line"
              }`}
            >
              {item.checked ? (
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 10.5l3.5 3.5L15 6.5" />
                </svg>
              ) : null}
            </button>

            <span className="flex flex-1 flex-col text-left">
              <span
                className={
                  item.checked ? "font-medium text-muted line-through" : "font-medium"
                }
              >
                {item.name}
              </span>
              <span className="text-sm text-muted">
                {formatQuantity(item.quantity, item.unit)}
                {item.source === "manual" ? " · added by hand" : ""}
              </span>
            </span>
          </form>

          {/* Quantity is editable in place — the prediction is a starting
              point, not a decision. */}
          <form action={updatePlanQuantityAction} className="flex items-center">
            <input type="hidden" name="planItemId" value={item.id} />
            <input type="hidden" name="month" value={month} />
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              defaultValue={item.quantity}
              aria-label={`Quantity of ${item.name}`}
              className="min-h-11 w-16 rounded-lg border border-line bg-bg px-2 text-center"
            />
            <button
              type="submit"
              aria-label={`Update quantity of ${item.name}`}
              className="min-h-11 px-2 text-sm text-accent"
            >
              Set
            </button>
          </form>

          <form action={removePlanItemAction}>
            <input type="hidden" name="planItemId" value={item.id} />
            <input type="hidden" name="month" value={month} />
            <button
              type="submit"
              aria-label={`Remove ${item.name} from the list`}
              className="flex size-10 items-center justify-center rounded-lg text-muted"
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 6l8 8M14 6l-8 8" />
              </svg>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
