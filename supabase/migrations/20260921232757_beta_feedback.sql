-- Small, local beta feedback inbox; no external service or public submission.
create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  user_id uuid references auth.users(id) on delete set null,
  path text not null check (length(path) between 1 and 200 and path like '/%' and path !~ '[?#]'),
  category text not null check (category in ('bug','confusing','feature_request','other')),
  message text not null check (length(btrim(message)) between 5 and 2000),
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now()
);
create index beta_feedback_shop_created on public.beta_feedback(shop_id,created_at desc);
alter table public.beta_feedback enable row level security;
revoke all on public.beta_feedback from public,anon,authenticated;
grant select on public.beta_feedback to authenticated;
grant insert(id,shop_id,user_id,path,category,message) on public.beta_feedback to authenticated;
grant update(status) on public.beta_feedback to authenticated;
create policy feedback_read on public.beta_feedback for select to authenticated using (
  shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid()))
  and (user_id=(select auth.uid()) or shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid()) and role in ('owner','manager','service_advisor')))
);
create policy feedback_submit on public.beta_feedback for insert to authenticated with check (
  user_id=(select auth.uid()) and shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid()))
);
create policy feedback_review on public.beta_feedback for update to authenticated using (
  shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid()) and role in ('owner','manager','service_advisor'))
);
