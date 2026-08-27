import { Suspense } from "react";
import { cookies } from "next/headers";
import LoginForm from "@/components/LoginForm";
import { SHOPPER_COOKIE } from "@/lib/session";

/** The cookie and the `?next=` hop are both request data, so they sit behind a
 *  boundary — the heading above them is prerendered and paints straight away
 *  on a cold visit. */
async function LoginFormLoader({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  const cookieStore = await cookies();

  return (
    <LoginForm
      next={typeof next === "string" ? next : "/"}
      defaultShopper={cookieStore.get(SHOPPER_COOKIE)?.value ?? ""}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Grocery Flow</h1>
        <p className="text-muted-foreground">
          What the household bought, month by month — and what next month
          probably needs.
        </p>
      </header>

      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}
      >
        <LoginFormLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
