"use client";

/** Most failures in this app are one of two things: the database isn't
 *  configured yet, or the connection dropped. Say which, instead of showing a
 *  blank screen. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isSetupProblem = error.message.includes("DATABASE_URL");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line p-6">
      <h1 className="text-xl font-semibold">
        {isSetupProblem ? "Database not connected yet" : "Something broke"}
      </h1>
      <p className="text-sm text-muted">
        {isSetupProblem
          ? "Copy .env.example to .env.local, paste your Postgres connection string, then run pnpm db:migrate."
          : "That request didn't go through. Try again — if it keeps failing, check the database is reachable."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-xl bg-accent px-5 font-semibold text-on-accent"
      >
        Try again
      </button>
    </div>
  );
}
