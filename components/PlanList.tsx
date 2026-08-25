import { CheckIcon, XIcon } from "lucide-react";
import {
  removePlanItemAction,
  togglePlanItemAction,
  updatePlanQuantityAction,
} from "@/app/(app)/plan/actions";
import type { PlanItem } from "@/lib/plan";
import { formatQuantity } from "@/lib/units";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

/** The shopping list itself. Every control is a plain form posting a server
 *  action, which keeps this a Server Component and means ticking works before
 *  the page has hydrated.
 *
 *  The tick control is therefore a submit button wearing the shadcn Checkbox's
 *  appearance rather than the Checkbox component itself: Base UI's Checkbox is
 *  a client component, and swapping it in would make the whole list client-side
 *  for no visual difference. */
function TickBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input"
      }`}
    >
      {checked ? <CheckIcon className="size-4" /> : null}
    </span>
  );
}

export default function PlanList({
  items,
  month,
}: {
  items: PlanItem[];
  month: string;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.id}>
            {index > 0 ? <Separator /> : null}
            {/* Five controls in one row leaves an item name about 70px on a
                small phone, which truncates real names like "Kotmale Fresh
                Milk 1L". Below ~22rem of available width the name takes the
                full line and the controls sit beneath it. */}
            <div className="@container">
              <div className="flex flex-col gap-1 px-3 py-2 @min-[22rem]:flex-row @min-[22rem]:items-center @min-[22rem]:gap-2">
              <form
                action={togglePlanItemAction}
                className="flex min-w-0 flex-1 items-center"
              >
                <input type="hidden" name="planItemId" value={item.id} />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="checked" value={String(!item.checked)} />

                <button
                  type="submit"
                  role="checkbox"
                  aria-checked={item.checked}
                  aria-label={`${item.checked ? "Untick" : "Tick off"} ${item.name}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <TickBox checked={item.checked} />

                  <span className="flex min-w-0 flex-col">
                    <span
                      className={`truncate font-medium ${
                        item.checked ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      {formatQuantity(item.quantity, item.unit)}
                      {item.source === "manual" ? (
                        <Badge variant="secondary" className="font-normal">
                          added by hand
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </button>
              </form>

              {/* On a narrow list this sits under the name, pushed right so
                  it still reads as belonging to the row above. */}
              <div className="flex shrink-0 items-center gap-1 self-end @min-[22rem]:self-auto">
                {/* Quantity is editable in place — the prediction is a
                    starting point, not a decision. */}
                <form
                  action={updatePlanQuantityAction}
                  className="flex items-center"
                >
                  <input type="hidden" name="planItemId" value={item.id} />
                  <input type="hidden" name="month" value={month} />
                  <Input
                    name="quantity"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    defaultValue={item.quantity}
                    aria-label={`Quantity of ${item.name}`}
                    className="h-11 w-16 px-2 text-center"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    aria-label={`Update quantity of ${item.name}`}
                    className="h-11 px-2 text-primary"
                  >
                    Set
                  </Button>
                </form>

                <form action={removePlanItemAction}>
                  <input type="hidden" name="planItemId" value={item.id} />
                  <input type="hidden" name="month" value={month} />
                  <Button
                    type="submit"
                    variant="ghost"
                    aria-label={`Remove ${item.name} from the list`}
                    className="size-10 text-muted-foreground"
                  >
                    <XIcon />
                  </Button>
                </form>
              </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
