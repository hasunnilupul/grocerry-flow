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
  id          uuid primary key default gen_random_uuid(),
  -- the plan going takes its rows with it; the item going must not
  plan_id     uuid not null references plans (id) on delete cascade,
  item_id     uuid not null references items (id) on delete restrict,
  quantity    numeric(12, 3) not null check (quantity > 0),
  unit        text not null,
  -- what it cost, filled in while shopping; null = not recorded yet, which
  -- carries straight through to the trip this list becomes
  total_price numeric(12, 2) check (total_price >= 0),
  -- 'predicted' from history, or 'manual' when added by hand
  source      text not null default 'predicted',
  checked     boolean not null default false,
  unique (plan_id, item_id)
);

-- For databases created before prices were kept on the list.
alter table plan_items
  add column if not exists total_price numeric(12, 2) check (total_price >= 0);

-- For databases created while item_id cascaded, which would have taken a row
-- off next month's list without saying so. Dropped and re-added rather than
-- altered, because a foreign key's delete rule can't be changed in place.
alter table plan_items drop constraint if exists plan_items_item_id_fkey;
alter table plan_items
  add constraint plan_items_item_id_fkey
  foreign key (item_id) references items (id) on delete restrict;

create index if not exists purchases_item_id_idx on purchases (item_id);
create index if not exists purchases_trip_id_idx on purchases (trip_id);
create index if not exists trips_shopped_at_idx on trips (shopped_at desc);
create index if not exists plan_items_plan_id_idx on plan_items (plan_id);
