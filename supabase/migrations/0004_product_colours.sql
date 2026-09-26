-- Available colours per product (a design can come in several colourways).
-- The primary colour (products.colour_id) is always one of them.

begin;

create table product_colours (
  product_id uuid not null references products(id) on delete cascade,
  colour_id  smallint not null references colours(id),
  primary key (product_id, colour_id)
);

alter table product_colours enable row level security;
alter table product_colours force row level security;
revoke all on product_colours from anon, authenticated;

-- Existing products: start with their primary colour.
insert into product_colours (product_id, colour_id)
select id, colour_id from products
on conflict do nothing;

-- Expose available colours (in colour sort order) on the storefront view.
create or replace view product_catalog with (security_invoker = true) as
select
  p.id,
  p.code,
  p.name,
  p.description,
  p.work,
  p.length_in,
  p.set_includes,
  p.wash_care,
  p.rate_paise,
  p.moq,
  p.stock_pcs,
  p.is_visible,
  p.is_trending,
  p.new_until,
  p.popularity,
  p.created_at,
  p.updated_at,
  c.slug as category_slug,
  f.name as fabric,
  co.name as colour,
  coalesce(
    array(select s.label from product_sizes ps join sizes s on s.id = ps.size_id
          where ps.product_id = p.id order by s.sort_order),
    '{}'
  ) as sizes,
  coalesce(
    array(select pi.id from product_images pi where pi.product_id = p.id order by pi.position),
    '{}'
  ) as image_ids,
  coalesce(
    array(select c2.name from product_colours pc join colours c2 on c2.id = pc.colour_id
          where pc.product_id = p.id order by (c2.id <> p.colour_id), c2.sort_order),
    '{}'
  ) as colours
from products p
join categories c on c.id = p.category_id
join fabrics f on f.id = p.fabric_id
join colours co on co.id = p.colour_id;

revoke all on product_catalog from anon, authenticated;

commit;
