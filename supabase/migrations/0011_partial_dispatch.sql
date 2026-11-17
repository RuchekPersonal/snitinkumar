-- Partial dispatch: an order can go out in several shipments, each sending some of the
-- sets of some designs. Each shipment keeps its own date, transport and LR number.
-- Order status: placed (nothing sent) → partial (some sent) → dispatched (all sent).

begin;

alter table orders drop constraint orders_status_check;
alter table orders
  add constraint orders_status_check check (status in ('placed', 'partial', 'dispatched', 'cancelled'));
comment on column orders.dispatched_at is 'Date of the latest shipment';

alter table order_items add column dispatched_sets integer not null default 0;
alter table order_items
  add constraint order_items_dispatched_sets_check check (dispatched_sets between 0 and sets);

create table order_dispatches (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  dispatched_on date not null,
  transport     text not null default '',
  lr            text not null default '',
  note          text not null default '',
  by_admin_id   uuid references admins(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index order_dispatches_order_idx on order_dispatches (order_id, dispatched_on);

create table order_dispatch_items (
  dispatch_id   uuid not null references order_dispatches(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete cascade,
  sets          integer not null check (sets > 0),
  primary key (dispatch_id, order_item_id)
);

-- Orders already marked dispatched become one shipment with everything in it.
insert into order_dispatches (order_id, dispatched_on, transport, lr, created_at)
select id, coalesce(dispatched_at, (created_at at time zone 'Asia/Kolkata')::date), dispatch_transport, dispatch_lr, updated_at
from orders where status = 'dispatched';
insert into order_dispatch_items (dispatch_id, order_item_id, sets)
select d.id, i.id, i.sets from order_dispatches d join order_items i on i.order_id = d.order_id;
update order_items i set dispatched_sets = i.sets from orders o where o.id = i.order_id and o.status = 'dispatched';

alter table orders drop column dispatch_transport, drop column dispatch_lr;

-- Records one shipment atomically. p_items: [{"item": <order_items.id>, "sets": n}, ...].
-- The order row is locked, so two people dispatching at once cannot send more than was ordered.
create function order_dispatch(
  p_order uuid, p_admin uuid, p_on date, p_transport text, p_lr text, p_note text, p_event_note text, p_items jsonb
) returns text
language plpgsql as $$
declare
  v_from text;
  v_to text;
  v_dispatch uuid;
  v_line record;
  v_total int;
  v_sent int;
begin
  select status into v_from from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_from not in ('placed', 'partial') then raise exception 'This order is already %', v_from; end if;
  if jsonb_array_length(coalesce(p_items, '[]')) = 0 then raise exception 'Choose at least one design to send'; end if;

  insert into order_dispatches (order_id, dispatched_on, transport, lr, note, by_admin_id)
  values (p_order, p_on, p_transport, p_lr, p_note, p_admin)
  returning id into v_dispatch;

  for v_line in
    select (e->>'item')::uuid as item_id, (e->>'sets')::int as sets from jsonb_array_elements(p_items) e
  loop
    if v_line.sets is null or v_line.sets < 1 then raise exception 'Sets to send must be at least 1'; end if;
    update order_items set dispatched_sets = dispatched_sets + v_line.sets
    where id = v_line.item_id and order_id = p_order and dispatched_sets + v_line.sets <= sets;
    if not found then raise exception 'That is more sets than are left to send for one of the designs'; end if;
    insert into order_dispatch_items (dispatch_id, order_item_id, sets) values (v_dispatch, v_line.item_id, v_line.sets);
  end loop;

  select sum(sets), sum(dispatched_sets) into v_total, v_sent from order_items where order_id = p_order;
  v_to := case when v_sent >= v_total then 'dispatched' else 'partial' end;
  update orders
  set status = v_to, dispatched_at = (select max(dispatched_on) from order_dispatches where order_id = p_order)
  where id = p_order;
  insert into order_events (order_id, from_status, to_status, by_admin_id, note)
  values (p_order, v_from, v_to, p_admin, p_event_note);
  return v_to;
end $$;

-- Removes one shipment (e.g. entered by mistake) and puts its sets back to "to send".
create function order_undo_dispatch(p_dispatch uuid, p_admin uuid, p_event_note text) returns text
language plpgsql as $$
declare
  v_order uuid;
  v_from text;
  v_to text;
  v_sent int;
begin
  select order_id into v_order from order_dispatches where id = p_dispatch;
  if not found then raise exception 'That dispatch was already removed'; end if;
  select status into v_from from orders where id = v_order for update;

  update order_items i set dispatched_sets = i.dispatched_sets - di.sets
  from order_dispatch_items di
  where di.dispatch_id = p_dispatch and di.order_item_id = i.id;
  delete from order_dispatches where id = p_dispatch;

  select sum(dispatched_sets) into v_sent from order_items where order_id = v_order;
  v_to := case when v_sent = 0 then 'placed' else 'partial' end;
  update orders
  set status = v_to, dispatched_at = (select max(dispatched_on) from order_dispatches where order_id = v_order)
  where id = v_order;
  insert into order_events (order_id, from_status, to_status, by_admin_id, note)
  values (v_order, v_from, v_to, p_admin, p_event_note);
  return v_to;
end $$;

do $$
declare t text;
begin
  foreach t in array array['order_dispatches', 'order_dispatch_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke execute on function order_dispatch(uuid, uuid, date, text, text, text, text, jsonb) from anon, authenticated, public;
revoke execute on function order_undo_dispatch(uuid, uuid, text) from anon, authenticated, public;

commit;
