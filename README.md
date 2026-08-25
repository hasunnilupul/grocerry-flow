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
| Month view | Total spend and per-item quantities, any month | Done |
| History | Month-by-month totals, comparison chart, average spend | Done |
| Prediction | Next month's list from typical quantity and purchase frequency | Done |
| Shopping mode | Tick items off in the shop; ticked items become a recorded trip | Done |

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

### Reading a month

The Month tab opens on the current month and walks backwards with the arrows.
It shows what was spent, how it compares with the month before, and every item
bought with its total quantity — folding `500 g` and `1 kg` of the same item
into `1.5 kg`, while keeping measures that can't be added (`2 kg` and `3 pcs`)
side by side.

History plots spend per month as a column chart and lists every month with its
total. Months that recorded no prices stay blank rather than being drawn as
zero, so an unpriced month never looks like a cheap one.

### How next month is predicted

The Plan tab builds next month's list from the last six months. For each item:

- **Typical quantity is the median**, not the average — one 20 kg stock-up
  month shouldn't push every future month's prediction up.
- **Frequency decides whether it appears at all.** An item bought once is a
  one-off, not a habit, and is left out. An item bought roughly quarterly only
  appears in the months it's actually due, not every month.
- **Every row says why it's there** — "Bought every month", "Bought 4 of the
  last 6 months", "Due — last bought 3 months ago". A list you can't argue with
  is a list you stop trusting.
- In the household's first month there's no pattern to find, so it falls back to
  "the same again" rather than showing an empty list.

Quantities round to whole numbers for things you count (eggs, packs) and two
decimals for things you weigh.

### Shopping mode

The predicted list is a starting point, not a decision: quantities are editable
in place, rows can be removed, and anything else can be added by hand. Re-running
the prediction replaces the predicted rows and leaves hand-added ones alone.

In the shop, tick items off as they go in the trolley. **Save trip** turns
everything ticked into a recorded trip dated today and clears those rows, so
what's left on the list is exactly what still needs buying. Prices aren't asked
for at the till — add them later from the Log tab, or leave them off.

Every control on this screen is a plain form posting to the server, so it keeps
working on a bad shop signal and with no client JavaScript.

Mobile-first throughout: thumb-reachable bottom navigation, 48px+ tap targets,
safe-area insets for notched phones, and light/dark themes that follow the
device.

## Currently being built

> All four planned features are built. Next up is using it for a couple of
> months and adjusting the prediction rule against what actually happens.

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
tests. Integration files run one at a time (`fileParallelism: false` on the
`integration` project) because they share that one database; running them
concurrently makes them truncate each other's rows mid-test.

Run one group on its own with `--project unit` or `--project integration`.

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
