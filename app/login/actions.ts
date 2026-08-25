"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SHOPPER_COOKIE,
  createSessionToken,
  normalizeShopper,
  requireAuthConfig,
  sessionMaxAgeSeconds,
} from "@/lib/session";

export type LoginState = { error: string | null };

/** Only allow relative paths back into the app, so `?next=` can't be used to
 *  bounce someone to another site after they log in. */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  let passcode: string;
  let secret: string;

  try {
    ({ passcode, secret } = requireAuthConfig());
  } catch {
    return {
      error:
        "This app isn't configured yet — APP_PASSCODE and SESSION_SECRET are missing.",
    };
  }

  const submitted = formData.get("passcode");
  if (typeof submitted !== "string" || submitted !== passcode) {
    return { error: "That passcode doesn't match. Try again." };
  }

  const shopper = normalizeShopper(String(formData.get("shopper") ?? ""));
  if (!shopper) {
    return { error: "Add your name so trips show who did the shopping." };
  }

  const cookieStore = await cookies();
  const maxAge = sessionMaxAgeSeconds();

  cookieStore.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  // Readable by the client so the trip form can pre-fill "who's shopping".
  cookieStore.set(SHOPPER_COOKIE, shopper, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  redirect(safeNextPath(formData.get("next")));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
