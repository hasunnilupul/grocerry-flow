# Grocery Flow

A small, shared grocery tracker for one household. Record what you buy each
month and in what quantity, see where the money went, and get next month's
shopping list predicted from your own history instead of guesswork.

Built for two people on two phones: one shared passcode, one shared database,
no accounts to manage.

## Why it exists

Monthly grocery shopping tends to run on memory — you re-buy what you notice is
missing and forget the rest until you're home. Grocery Flow keeps the boring
record so the next list writes itself:

- **Record** each shop trip in a few taps, with quantity, unit, and price.
- **Review** the month: total spend, per-item quantities, how it compares to
  the months before it.
- **Predict** next month from what you actually buy, then take that list to the
  shop as a checklist.

## Features

| Area | What it does | Status |
| --- | --- | --- |
| Shared access | One household passcode; each device remembers who's shopping | Done |
| Log a trip | Fast entry: date, store, and a row per item with quantity/unit/price | Done |
| Month view | Total spend and per-item quantities for the current month | Planned — PR 3 |
| History | Month-by-month totals and comparison | Planned — PR 3 |
| Prediction | Next month's list from average quantity and purchase frequency | Planned — PR 4 |
| Shopping mode | Tick items off in the shop; ticked items become a recorded trip | Planned — PR 4 |

### Logging a trip

The entry screen is the one you'll use most, so it's built to be quick:

- Date defaults to today; the store field suggests places you've shopped before.
- Item names autocomplete from everything you've ever bought, and picking a
  known item switches to the unit you normally buy it in — unless you've
  already chosen one yourself.
- A running total updates as you type prices, on a save bar that stays in reach
  above the navigation.
- Prices are optional. A trip with no prices is still a valid record of
  quantities, and shows as "—" rather than as costing zero.
- Two rows for the same item and unit are merged when saved, so a second carton
  spotted at the till doesn't create a duplicate line.

Mobile-first throughout: thumb-reachable bottom navigation, 48px+ tap targets,
safe-area insets for notched phones, and light/dark themes that follow the
device.

## Currently being built

> **PR 2 — Log a trip.** Fast entry form with item autocomplete, remembered
> units, running total, and a recent-trips list. Month, History and Plan are
> still placeholders.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Postgres** via [postgres.js](https://github.com/porsager/postgres) — works
  with Supabase or Neon out of the box
- **Vitest** + **React Testing Library** for unit tests

## Getting started

### 1. Create a database

Make a free Postgres database on [Supabase](https://supabase.com) or
[Neon](https://neon.tech) and copy its connection string.

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `APP_PASSCODE` | The shared passcode you both type once per device |
| `SESSION_SECRET` | Signs the session cookie — any long random string |
| `NEXT_PUBLIC_CURRENCY` | Optional ISO code (`LKR`, `USD`, `EUR`…). Left unset, amounts show without a symbol |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the tables

```bash
pnpm db:migrate
```

The schema in `lib/schema.sql` is idempotent, so this is safe to re-run.

### 4. Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and enter your passcode.

## Testing

```bash
pnpm test         # single run
pnpm test:watch   # re-run on change
```

Components and pure logic (month maths, unit conversion, price parsing,
session tokens) are covered by unit tests.

Database queries have their own integration tests that run against a real
Postgres. They skip unless `TEST_DATABASE_URL` is set, so the default run needs
nothing installed:

```bash
docker run -d --rm --name gf-test-pg -e POSTGRES_PASSWORD=gftest \
  -e POSTGRES_DB=grocery -p 55432:5432 postgres:16-alpine

TEST_DATABASE_URL=postgresql://postgres:gftest@localhost:55432/grocery pnpm test
```

Point it at a throwaway database — the suite truncates every table between
tests.

## Deploying

Deploy to [Vercel](https://vercel.com) and set the same three environment
variables in the project settings. Run `pnpm db:migrate` once against the
production database. Both phones then use the same URL and passcode.

## Project layout

```
app/
  (app)/          Authenticated screens (month, log, plan, history)
  login/          Passcode screen and its server actions
components/       Shared UI, each with a colocated .test.tsx
lib/
  db.ts           Pooled Postgres client
  schema.sql      Table definitions
  month.ts        Month-key maths (YYYY-MM)
  units.ts        Units and quantity conversion
  session.ts      Signed session cookie helpers
proxy.ts          Passcode gate (Next.js 16's replacement for middleware.ts)
scripts/migrate.mjs
```

## Development workflow

Work happens on feature branches cut from `dev`, one branch per feature, merged
back into `dev` by pull request. Every component ships with unit tests.
