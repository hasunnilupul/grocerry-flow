/** Session handling for a two-person household.
 *
 *  There are no user accounts: everyone who knows the passcode is "us". The
 *  session cookie is an HMAC over an expiry, so it can't be forged without
 *  SESSION_SECRET. Web Crypto is used throughout so this same module works in
 *  `proxy.ts` (edge runtime) and in server actions.
 */

export const SESSION_COOKIE = "gf_session";
export const SHOPPER_COOKIE = "gf_shopper";

const SESSION_DAYS = 60;

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return base64UrlEncode(signature);
}

/** Compare in constant time so a wrong token can't be guessed byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function sessionMaxAgeSeconds(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

/** Mint a cookie value of the form `<expiryMs>.<signature>`. */
export async function createSessionToken(
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const expiresAt = now + sessionMaxAgeSeconds() * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  return timingSafeEqual(signature, await hmac(payload, secret));
}

/** Both secrets are required in production; failing loudly beats silently
 *  serving the household's data to anyone who finds the URL. */
export function requireAuthConfig(): { passcode: string; secret: string } {
  const passcode = process.env.APP_PASSCODE;
  const secret = process.env.SESSION_SECRET;

  if (!passcode || !secret) {
    throw new Error(
      "APP_PASSCODE and SESSION_SECRET must be set. See .env.example.",
    );
  }
  return { passcode, secret };
}

/** Trim and collapse whitespace so "  Nimal " and "Nimal" are the same shopper. */
export function normalizeShopper(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 40);
}
