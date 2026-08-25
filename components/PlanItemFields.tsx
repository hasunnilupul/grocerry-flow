"use client";

import { useRef } from "react";
import { updatePlanItemAction } from "@/app/(app)/plan/actions";
import type { PlanItem } from "@/lib/plan";
import { UNITS } from "@/lib/units";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Quantity, unit and price for one row of the shopping list.
 *
 *  There is no "Set" button: the form submits itself when a field is left or
 *  the unit changes, because pressing save on every row while standing in an
 *  aisle is exactly the friction this screen is supposed to remove. It is
 *  still a real form posting a server action, so pressing Enter works and
 *  nothing is lost if the JS hasn't loaded. */
export default function PlanItemFields({
  item,
  month,
}: {
  item: PlanItem;
  month: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function save() {
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={updatePlanItemAction}
      className="flex items-center gap-1.5"
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
        onBlur={save}
        aria-label={`Quantity of ${item.name}`}
        className="h-11 w-14 shrink-0 px-1 text-center"
      />

      <div className="w-20 shrink-0">
        <Select
          name="unit"
          defaultValue={item.unit}
          // The hidden input Base UI renders updates after this fires, so
          // submit on the next tick or the old unit would be sent.
          onValueChange={() => setTimeout(save, 0)}
        >
          <SelectTrigger
            aria-label={`Unit of ${item.name}`}
            className="h-11 w-full data-[size=default]:h-11"
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

      <Input
        name="price"
        type="text"
        inputMode="decimal"
        placeholder="Price"
        defaultValue={item.price ?? ""}
        onBlur={save}
        aria-label={`Price of ${item.name}`}
        className="h-11 min-w-0 flex-1"
      />

      {/* Keeps the form submittable by keyboard and without JS. */}
      <button type="submit" className="sr-only">
        Update {item.name}
      </button>
    </form>
  );
}
