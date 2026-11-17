-- Soft delete for products: a deleted design leaves the store and the admin lists but
-- keeps its row, photos and enquiry history, so it can be restored from the Deleted tab.

begin;

alter table products
  add column deleted_at timestamptz,
  add column deleted_by uuid references admins(id) on delete set null;

create index products_deleted_idx on products (deleted_at) where deleted_at is not null;

-- Same columns as 0004; deleted designs are never part of the storefront catalogue.
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
join colours co on co.id = p.colour_id
where p.deleted_at is null;

revoke all on product_catalog from anon, authenticated;

commit;
