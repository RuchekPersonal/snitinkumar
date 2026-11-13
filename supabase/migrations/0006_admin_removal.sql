-- Removing an admin user keeps the history they touched: who approved a retailer or moved
-- an enquiry becomes empty instead of the delete being refused.

alter table retailers drop constraint if exists retailers_approved_by_fkey;
alter table retailers
  add constraint retailers_approved_by_fkey foreign key (approved_by) references admins(id) on delete set null;

alter table enquiry_events drop constraint if exists enquiry_events_by_admin_id_fkey;
alter table enquiry_events
  add constraint enquiry_events_by_admin_id_fkey foreign key (by_admin_id) references admins(id) on delete set null;
