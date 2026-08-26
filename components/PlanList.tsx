import { CheckIcon, XIcon } from "lucide-react";
import {
  removePlanItemAction,
  togglePlanItemAction,
} from "@/app/(app)/plan/actions";
import PlanItemFields from "@/components/PlanItemFields";
import type { PlanItem } from "@/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/** The tick control is a submit button wearing the shadcn Checkbox's
 *  appearance rather than the Checkbox component: Base UI's Checkbox is a
 *  client component, and ticking has to keep working before hydration. */
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

            {/* Name on its own line, then the numbers. Five controls on one
                line leaves a real item name about 70px on a phone. */}
            <div className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <form
                  action={togglePlanItemAction}
                  className="flex min-w-0 flex-1 items-center"
                >
                  <input type="hidden" name="planItemId" value={item.id} />
                  <input type="hidden" name="month" value={month} />
                  <input
                    type="hidden"
                    name="checked"
                    value={String(!item.checked)}
                  />

                  <button
                    type="submit"
                    role="checkbox"
                    aria-checked={item.checked}
                    aria-label={`${item.checked ? "Untick" : "Tick off"} ${item.name}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <TickBox checked={item.checked} />
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`truncate font-medium ${
                          item.checked
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.source === "manual" ? (
                        <Badge
                          variant="secondary"
                          className="shrink-0 font-normal"
                        >
                          by hand
                        </Badge>
                      ) : null}
                    </span>
                  </button>
                </form>

                <form action={removePlanItemAction} className="shrink-0">
                  <input type="hidden" name="planItemId" value={item.id} />
                  <input type="hidden" name="month" value={month} />
                  <Button
                    type="submit"
                    variant="ghost"
                    aria-label={`Remove ${item.name} from the list`}
                    className="size-9 text-muted-foreground"
                  >
                    <XIcon />
                  </Button>
                </form>
              </div>

              {/* Indented to line up under the item name. */}
              <div className="pl-9">
                <PlanItemFields item={item} month={month} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
