-- Grocery Flow schema. Idempotent: safe to re-run via `pnpm db:migrate`.

create table if not exists items (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- lowercased/collapsed name, so "Red Onions" and "red  onions" are one item
  normalized_name text not null unique,
  category        text not null default 'Other',
  default_unit    text not null default 'pcs',
  created_at      timestamptz not null default now()
);

create table if not exists trips (
  id         uuid primary key default gen_random_uuid(),
  -- calendar date of the shop, not a timestamp: a trip belongs to a day
  shopped_at date not null,
  store      text,
  shopper    text,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips (id) on delete cascade,
  item_id     uuid not null references items (id) on delete restrict,
  quantity    numeric(12, 3) not null check (quantity > 0),
  unit        text not null,
  -- price of the whole line, in the household's currency; null = not recorded
  total_price numeric(12, 2) check (total_price >= 0),
  created_at  timestamptz not null default now()
);

-- One plan per month, holding next month's predicted/edited shopping list.
create table if not exists plans (
  id         uuid primary key default gen_random_uuid(),
  -- always the first day of the month the plan is for
  month      date not null unique,
  created_at timestamptz not null default now()
);

create table if not exists plan_items (
  id       uuid primary key default gen_random_uuid(),
  plan_id  uuid not null references plans (id) on delete cascade,
  item_id  uuid not null references items (id) on delete cascade,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit     text not null,
  -- 'predicted' from history, or 'manual' when added by hand
  source   text not null default 'predicted',
  checked  boolean not null default false,
  unique (plan_id, item_id)
);

create index if not exists purchases_item_id_idx on purchases (item_id);
create index if not exists purchases_trip_id_idx on purchases (trip_id);
create index if not exists trips_shopped_at_idx on trips (shopped_at desc);
create index if not exists plan_items_plan_id_idx on plan_items (plan_id);
