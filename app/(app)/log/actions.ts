"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, SHOPPER_COOKIE, verifySessionToken } from "@/lib/session";
import { mergeDuplicateRows, parseTripForm } from "@/lib/trip-form";
import { deleteTrip, saveTrip } from "@/lib/trips";

export type SaveTripState = { error: string | null };

/** Server actions are reachable by direct POST, not only through the form, so
 *  each one re-checks the session rather than trusting the proxy. */
async function requireSession(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  const cookieStore = await cookies();

  const valid = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
    secret ?? "",
  );
  if (!secret || !valid) {
    throw new Error("Not signed in.");
  }

  return cookieStore.get(SHOPPER_COOKIE)?.value ?? null;
}

export async function saveTripAction(
  _previous: SaveTripState,
  formData: FormData,
): Promise<SaveTripState> {
  const shopper = await requireSession();

  const parsed = parseTripForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const trip = {
    ...parsed.trip,
    rows: mergeDuplicateRows(parsed.trip.rows),
  };

  try {
    await saveTrip(trip, shopper);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Couldn't save the trip: ${message}` };
  }

  // The month view, history and the plan's "already bought" state all change.
  revalidatePath("/", "layout");
  redirect("/?saved=1");
}

export async function deleteTripAction(formData: FormData) {
  await requireSession();

  const id = String(formData.get("tripId") ?? "");
  if (!id) return;

  await deleteTrip(id);
  revalidatePath("/", "layout");
}
