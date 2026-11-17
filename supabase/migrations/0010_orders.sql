-- Orders taken by admins (e.g. on a business trip): a customer, designs in sets, then
-- dispatched from head office. Separate from enquiries, which are website requests.
-- A set is one piece of each chosen size, so pcs = sets × number of sizes.

begin;

-- Trips group the orders taken on one journey ("Jaipur – Nov 2026").
create table trips (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 2 and 60),
  created_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index trips_name_key on trips (lower(name));

create sequence order_ref_seq start 1001;

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique default ('ORD-' || nextval('order_ref_seq')),
  -- Set by the device that built the order, so a retried submit cannot create it twice.
  client_token       uuid not null unique,
  retailer_id        uuid not null references retailers(id),
  trip_id            uuid references trips(id) on delete set null,
  status             text not null default 'placed' check (status in ('placed', 'dispatched', 'cancelled')),
  note               text not null default '',
  transport          text not null default '',
  total_sets         integer not null check (total_sets > 0),
  total_pcs          integer not null check (total_pcs > 0),
  total_paise        bigint not null check (total_paise >= 0),
  taken_by           uuid references admins(id) on delete set null,
  dispatched_at      date,
  dispatch_transport text not null default '',
  dispatch_lr        text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_status_idx on orders (status, created_at desc);
create index orders_trip_idx on orders (trip_id);
create index orders_retailer_idx on orders (retailer_id);

create table order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references orders(id) on delete cascade,
  position            smallint not null default 0,
  product_id          uuid references products(id) on delete set null,
  code_snapshot       text not null,
  name_snapshot       text not null,
  rate_paise_snapshot integer not null check (rate_paise_snapshot > 0),
  sizes               text[] not null check (cardinality(sizes) > 0),
  sets                integer not null check (sets between 1 and 10000),
  pcs                 integer not null,
  check (pcs = sets * cardinality(sizes))
);
create index order_items_order_idx on order_items (order_id, position);

create table order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  by_admin_id uuid references admins(id) on delete set null,
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index order_events_order_idx on order_events (order_id, created_at desc);

create trigger orders_touch before update on orders for each row execute function touch_updated_at();

-- Server-only, like every other table: no policies, no anon/authenticated access.
do $$
declare t text;
begin
  foreach t in array array['trips', 'orders', 'order_items', 'order_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence order_ref_seq from anon, authenticated;

commit;
