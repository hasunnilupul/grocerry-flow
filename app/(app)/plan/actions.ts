"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE,
  SHOPPER_COOKIE,
  verifySessionToken,
} from "@/lib/session";
import { isMonthKey, todayIsoDate, type MonthKey } from "@/lib/month";
import { cleanItemName, isValidItemName } from "@/lib/items";
import { parseMoney } from "@/lib/money";
import { isUnit } from "@/lib/units";
import {
  addPlanItem,
  convertCheckedToTrip,
  generatePlan,
  removePlanItem,
  setPlanItemChecked,
  setPlanItemFields,
} from "@/lib/plan";

export type PlanState = { error: string | null; notice: string | null };

async function requireSession(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  const cookieStore = await cookies();

  const valid = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
    secret ?? "",
  );
  if (!secret || !valid) throw new Error("Not signed in.");

  return cookieStore.get(SHOPPER_COOKIE)?.value ?? null;
}

function readMonth(formData: FormData): MonthKey {
  const month = String(formData.get("month") ?? "");
  if (!isMonthKey(month)) throw new Error("Bad month.");
  return month;
}

export async function generatePlanAction(formData: FormData) {
  await requireSession();
  await generatePlan(readMonth(formData));
  revalidatePath("/plan");
}

export async function togglePlanItemAction(formData: FormData) {
  await requireSession();

  const id = String(formData.get("planItemId") ?? "");
  if (!id) return;

  await setPlanItemChecked(id, formData.get("checked") === "true");
  revalidatePath("/plan");
}

export async function removePlanItemAction(formData: FormData) {
  await requireSession();

  const id = String(formData.get("planItemId") ?? "");
  if (!id) return;

  await removePlanItem(id);
  revalidatePath("/plan");
}

/** Quantity, unit and price save together — they live on one row and are
 *  edited as one thing. Anything invalid leaves the row untouched rather than
 *  wiping a value someone already typed. */
export async function updatePlanItemAction(formData: FormData) {
  await requireSession();

  const id = String(formData.get("planItemId") ?? "");
  if (!id) return;

  const quantity = Number(String(formData.get("quantity") ?? ""));
  if (!Number.isFinite(quantity) || quantity <= 0) return;

  const unit = String(formData.get("unit") ?? "");
  if (!isUnit(unit)) return;

  await setPlanItemFields(id, {
    quantity: Math.round(quantity * 1000) / 1000,
    unit,
    // Blank clears the price back to "not recorded"; it never becomes zero.
    price: parseMoney(String(formData.get("price") ?? "")),
  });
  revalidatePath("/plan");
}

export async function addPlanItemAction(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  await requireSession();

  const month = readMonth(formData);
  const name = String(formData.get("itemName") ?? "");
  const quantity = Number(String(formData.get("quantity") ?? ""));
  const unit = String(formData.get("unit") ?? "");

  if (!isValidItemName(name)) {
    return { error: "Give the item a name.", notice: null };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity has to be above zero.", notice: null };
  }
  if (!isUnit(unit)) {
    return { error: "Pick a unit.", notice: null };
  }

  await addPlanItem(month, cleanItemName(name), quantity, unit);
  revalidatePath("/plan");
  return { error: null, notice: `Added ${cleanItemName(name)}.` };
}

export async function checkoutPlanAction(
  _previous: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const shopper = await requireSession();
  const month = readMonth(formData);
  const store = String(formData.get("store") ?? "").trim() || null;

  const result = await convertCheckedToTrip(
    month,
    todayIsoDate(),
    store,
    shopper,
  );

  if (!result) {
    return { error: "Tick something off before saving a trip.", notice: null };
  }

  // The month view, history and the plan all move.
  revalidatePath("/", "layout");
  return {
    error: null,
    notice: `Saved ${result.itemCount} item${result.itemCount === 1 ? "" : "s"} as a trip.`,
  };
}
