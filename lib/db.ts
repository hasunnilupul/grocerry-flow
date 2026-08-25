import "server-only";
import postgres from "postgres";

/** A single pooled connection, reused across hot reloads in dev so `next dev`
 *  doesn't exhaust the database's connection limit. */
declare global {
  var __groceryFlowSql: postgres.Sql | undefined;
}

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Postgres connection string.",
    );
  }

  return postgres(url, {
    // Supabase's pooler and Neon both require TLS, but present certificates
    // that don't verify against the local trust store.
    ssl: url.includes("localhost") ? false : "require",
    max: 5,
    idle_timeout: 20,
  });
}

/** Connect on first query, not on import. `next build` evaluates every route's
 *  modules to collect page config, and must not need a live database to do it. */
export function getSql(): postgres.Sql {
  const existing = globalThis.__groceryFlowSql;
  if (existing) return existing;

  const created = connect();
  if (process.env.NODE_ENV !== "production") {
    globalThis.__groceryFlowSql = created;
  }
  return created;
}

/** postgres.js returns `numeric` columns as strings to protect precision.
 *  Quantities and prices here are far inside the safe-integer range, so read
 *  them through this rather than sprinkling `Number(...)` over query results. */
export function num(value: string | number | null): number {
  return value === null ? 0 : Number(value);
}

/** Same, but keeps "not recorded" distinct from "zero" — a trip with no price
 *  entered must not be reported as costing 0. */
export function numOrNull(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}
