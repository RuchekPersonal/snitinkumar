-- Editable home page: hero photos and category photos managed from the admin.
-- Text lives in the existing `settings` table (key 'home_hero').

begin;

-- Non-product images, stored as base64 like product photos (RFD §6).
create table site_images (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('hero', 'category')),
  position   smallint check (position between 0 and 4), -- hero slot (0 = large tile)
  full_b64   text not null,
  thumb_b64  text not null,
  og_b64     text,                                      -- 1200×630 link preview (categories)
  width      integer not null,
  height     integer not null,
  bytes      integer not null,
  created_at timestamptz not null default now(),
  check ((kind = 'hero') = (position is not null))
);

create unique index site_images_hero_slot on site_images (position) where kind = 'hero';

alter table site_images enable row level security;
alter table site_images force row level security;
revoke all on site_images from anon, authenticated;

-- Category covers now point at site_images (the old link to product_images was never used).
alter table categories drop constraint if exists categories_cover_fk;
update categories set cover_image_id = null;
alter table categories
  add constraint categories_cover_fk foreign key (cover_image_id) references site_images(id) on delete set null;

commit;
