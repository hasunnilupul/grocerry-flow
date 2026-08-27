import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Everything behind the passcode. `proxy.ts` replaced `middleware.ts` in
 *  Next.js 16 — same job, same API. */
export async function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;

  // Without a secret no token can ever verify, so let the login page render
  // and explain the missing configuration rather than redirect-looping.
  if (!secret) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token, secret)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Guard every page except the login route itself and static assets. The
  // manifest and its icons have to stay public: a browser weighing up an
  // install prompt fetches them, and a redirect to /login reads as a broken
  // manifest rather than a locked one.
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon.png|icon-[^/]+\.png).*)",
  ],
};
