-- Flat product rows for the storefront: one row per product with names instead of ids,
-- sizes in display order and image ids in gallery order. No image bytes.

begin;

create view product_catalog with (security_invoker = true) as
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
  ) as image_ids
from products p
join categories c on c.id = p.category_id
join fabrics f on f.id = p.fabric_id
join colours co on co.id = p.colour_id;

revoke all on product_catalog from anon, authenticated;

commit;
