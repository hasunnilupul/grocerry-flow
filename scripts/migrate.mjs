// Applies lib/schema.sql to DATABASE_URL. The schema is idempotent, so this is
// safe to run on every deploy. Run with: pnpm db:migrate
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));

// .env.local isn't loaded outside `next dev`, so read it ourselves.
async function loadEnvFile(path) {
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

await loadEnvFile(join(here, "..", ".env.local"));
await loadEnvFile(join(here, "..", ".env"));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Copy .env.example to .env.local and paste your Supabase or Neon connection string.",
  );
  process.exit(1);
}

const schema = await readFile(join(here, "..", "lib", "schema.sql"), "utf8");
const sql = postgres(url, {
  ssl: url.includes("localhost") ? false : "require",
  max: 1,
});

try {
  await sql.unsafe(schema);
  console.log("Schema applied.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
