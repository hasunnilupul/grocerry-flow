import { cookies } from "next/headers";
import LoginForm from "@/components/LoginForm";
import { SHOPPER_COOKIE } from "@/lib/session";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const cookieStore = await cookies();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Grocery Flow</h1>
        <p className="text-muted">
          What the household bought, month by month — and what next month
          probably needs.
        </p>
      </header>

      <LoginForm
        next={typeof next === "string" ? next : "/"}
        defaultShopper={cookieStore.get(SHOPPER_COOKIE)?.value ?? ""}
      />
    </main>
  );
}
