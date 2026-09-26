-- S. Nitinkumar — initial schema (RFD §8).
--
-- Access model (RFD §2.1): only the Next.js server talks to the database, using the
-- secret key (service_role). Row Level Security is enabled on every table with no
-- policies, and anon/authenticated privileges are revoked, so the public keys can read
-- or write nothing even if they leak.
--
-- Passwords: never stored in plain text or reversible encryption. Staff passwords are
-- one-way Argon2id hashes, enforced by a CHECK constraint. Retailers log in by phone OTP
-- and have no password at all.

begin;

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- lookup tables

create table categories (
  id           smallint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  short_name   text not null,
  description  text not null default '',
  cover_image_id uuid,
  show_on_home boolean not null default false,
  is_visible   boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);

create table fabrics (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  sort_order smallint not null default 0
);

create table colours (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  hex        text check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null default 0
);

create table sizes (
  id         smallint generated always as identity primary key,
  label      text not null unique,
  sort_order smallint not null default 0
);

-- ---------------------------------------------------------------- products

create table products (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^SN-[0-9]{3,6}$'),
  name                text not null,
  category_id         smallint not null references categories(id),
  fabric_id           smallint not null references fabrics(id),
  colour_id           smallint not null references colours(id),
  description         text not null default '',
  work                text not null default '',
  length_in           smallint check (length_in between 10 and 80),
  set_includes        text not null default '',
  wash_care           text not null default '',
  rate_paise          integer not null check (rate_paise > 0),
  mrp_paise           integer check (mrp_paise is null or mrp_paise >= rate_paise),
  moq                 smallint not null default 3 check (moq >= 1),
  stock_pcs           integer not null default 0 check (stock_pcs >= 0),
  low_stock_threshold integer not null default 20,
  is_visible          boolean not null default false,
  is_trending         boolean not null default false,
  new_until           date,
  popularity          integer not null default 0,
  search_text         text generated always as (lower(code || ' ' || name || ' ' || work)) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index products_listing_idx on products (is_visible, category_id, created_at desc);
create index products_new_idx on products (new_until) where new_until is not null;
create index products_search_idx on products using gin (search_text gin_trgm_ops);

create table product_sizes (
  product_id uuid not null references products(id) on delete cascade,
  size_id    smallint not null references sizes(id),
  primary key (product_id, size_id)
);

-- Product photos stored as base64 text (RFD §6). Kept out of the products row so
-- listings never load image bytes; served by /api/img with long cache headers.
create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  position   smallint not null default 0,
  alt        text not null default '',
  thumb_b64  text not null,
  card_b64   text not null,
  full_b64   text not null,
  og_b64     text not null,
  width      integer not null,
  height     integer not null,
  bytes      integer not null,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

alter table categories
  add constraint categories_cover_fk foreign key (cover_image_id) references product_images(id) on delete set null;

-- ---------------------------------------------------------------- people

create table admins (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email) and email like '%_@_%'),
  name          text not null,
  role          text not null default 'staff' check (role in ('owner', 'staff')),
  -- One-way Argon2id hash (PHC string). The check makes it impossible to store a plain password.
  password_hash text not null check (password_hash like '$argon2id$%'),
  failed_logins smallint not null default 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

create table retailers (
  id             uuid primary key default gen_random_uuid(),
  mobile         text not null unique check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  shop_name      text not null,
  owner_name     text not null,
  email          text,
  gstin          text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  address        text not null default '',
  city           text not null,
  state          text not null default '',
  pincode        text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  transport_pref text not null default '',
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'blocked')),
  status_reason  text,
  approved_by    uuid references admins(id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index retailers_status_idx on retailers (status, created_at desc);

-- ---------------------------------------------------------------- enquiries

create sequence enquiry_ref_seq start 1048;

create table enquiries (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique default ('ENQ-' || nextval('enquiry_ref_seq')),
  retailer_id        uuid references retailers(id),
  guest_name         text,
  guest_shop         text,
  guest_city         text,
  source             text not null default 'website' check (source in ('website', 'whatsapp', 'manual')),
  status             text not null default 'new' check (status in ('new', 'confirmed', 'dispatched', 'cancelled')),
  note_from_retailer text not null default '',
  internal_note      text not null default '',
  est_value_paise    integer, -- indicative only (no tax); null when sent without rates
  total_pcs          integer not null check (total_pcs > 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index enquiries_status_idx on enquiries (status, created_at desc);
create index enquiries_retailer_idx on enquiries (retailer_id, created_at desc);

create table enquiry_items (
  id                  uuid primary key default gen_random_uuid(),
  enquiry_id          uuid not null references enquiries(id) on delete cascade,
  product_id          uuid references products(id) on delete set null,
  code_snapshot       text not null,
  name_snapshot       text not null,
  rate_paise_snapshot integer not null,
  qty                 integer not null check (qty > 0)
);

create table enquiry_events (
  id          uuid primary key default gen_random_uuid(),
  enquiry_id  uuid not null references enquiries(id) on delete cascade,
  from_status text,
  to_status   text not null,
  by_admin_id uuid references admins(id),
  note        text not null default '',
  created_at  timestamptz not null default now()
);

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- housekeeping

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch before update on products for each row execute function touch_updated_at();
create trigger enquiries_touch before update on enquiries for each row execute function touch_updated_at();

-- ---------------------------------------------------------------- lock down

do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'fabrics', 'colours', 'sizes', 'products', 'product_sizes', 'product_images',
    'admins', 'retailers', 'enquiries', 'enquiry_items', 'enquiry_events', 'settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

revoke all on sequence enquiry_ref_seq from anon, authenticated;
revoke execute on function touch_updated_at() from anon, authenticated, public;

commit;
