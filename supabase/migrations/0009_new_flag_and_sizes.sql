-- "Mark as new" is now an on/off flag that stays until it is unticked, instead of a
-- 14-day end date. Products that are new today keep their tag. new_until is no longer used.
-- Also adds sizes 4XL and 5XL after 3XL.

begin;

alter table products add column is_new boolean not null default false;
update products
  set is_new = true
  where new_until >= (now() at time zone 'Asia/Kolkata')::date;

-- Same as 0007 with is_new appended (a view can only gain columns at the end).
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
  ) as colours,
  p.is_new
from products p
join categories c on c.id = p.category_id
join fabrics f on f.id = p.fabric_id
join colours co on co.id = p.colour_id
where p.deleted_at is null;


revoke all on product_catalog from anon, authenticated;

insert into sizes (label, sort_order)
select v.label, (select coalesce(max(sort_order), 0) from sizes) + v.n
from (values ('4XL', 1), ('5XL', 2)) as v(label, n)
where not exists (select 1 from sizes s where s.label = v.label);

commit;
