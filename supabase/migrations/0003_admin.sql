-- Admin portal support (Phase 3).

begin;

-- Guests message us from their own WhatsApp; staff can record the number to reply later.
alter table enquiries
  add column guest_phone text check (guest_phone is null or guest_phone ~ '^\+?[0-9 ]{10,16}$');

-- Reorders a product's photos in one statement-safe transaction (position is unique per product).
create function reorder_product_images(p_product uuid, p_ids uuid[]) returns void
language plpgsql as $$
begin
  if (select count(*) from product_images where product_id = p_product) <> coalesce(array_length(p_ids, 1), 0)
     or exists (select 1 from unnest(p_ids) as i(id)
                where not exists (select 1 from product_images pi where pi.id = i.id and pi.product_id = p_product)) then
    raise exception 'image list does not match product';
  end if;
  update product_images set position = position + 1000 where product_id = p_product;
  update product_images pi set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where pi.id = o.id;
end $$;

revoke execute on function reorder_product_images(uuid, uuid[]) from anon, authenticated, public;

commit;
