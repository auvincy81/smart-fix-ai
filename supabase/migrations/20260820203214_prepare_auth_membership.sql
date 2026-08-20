-- Phase 3A prepares membership identities without adding access policies.
-- Deleting an authentication user removes only that user's memberships.

alter table public.shop_members
  add constraint shop_members_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

comment on column public.shop_members.user_id is
  'Supabase Auth user. Shop roles are authoritative here, never in editable user metadata.';
