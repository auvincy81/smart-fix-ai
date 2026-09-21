-- Phase 4: local shop bootstrap and the first persistent business workflows.
-- No client can create memberships or change a record's shop after insertion.
revoke all on public.shops, public.shop_members, public.customers, public.vehicles from public, anon, authenticated;
grant select on public.shops, public.shop_members, public.customers, public.vehicles to authenticated;
grant insert on public.customers, public.vehicles to authenticated;
grant update (first_name, last_name, phone, email, address, city, state, postal_code, notes)
  on public.customers to authenticated;
grant update (customer_id, vin, year, make, model, trim, engine, license_plate, plate_state, color, mileage, notes)
  on public.vehicles to authenticated;
-- No delete grants/policies: preserve records for future service history.

create index shop_members_user_shop_idx on public.shop_members (user_id, shop_id);

create policy memberships_read_own on public.shop_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy shops_read_member on public.shops for select to authenticated
  using (id in (select shop_id from public.shop_members where user_id = (select auth.uid())));

create policy customers_read_member on public.customers for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy customers_insert_staff on public.customers for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));
create policy customers_update_staff on public.customers for update to authenticated
  using (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')))
  with check (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));

create policy vehicles_read_member on public.vehicles for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy vehicles_insert_staff on public.vehicles for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));
create policy vehicles_update_staff on public.vehicles for update to authenticated
  using (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')))
  with check (shop_id in (select shop_id from public.shop_members
    where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));

-- SECURITY DEFINER is needed only to bootstrap the first membership: callers
-- have no INSERT permission on shops/shop_members. No authorization helper is
-- needed by the policies above; membership SELECT is non-recursive.
create function public.create_initial_shop(
  p_name text, p_phone text default null, p_email text default null,
  p_address text default null, p_city text default null, p_state text default null,
  p_postal_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_shop_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  -- Serialize concurrent bootstrap requests for this user. Locking the auth
  -- row also coordinates with user deletion; the FK never cascades to shops.
  perform 1 from auth.users where id = caller_id for update;
  if not found then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if exists (select 1 from public.shop_members where user_id = caller_id) then
    raise exception 'Shop membership already exists' using errcode = '23505';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 160
    or length(p_phone) > 40 or length(p_email) > 254
    or length(p_address) > 300 or length(p_city) > 100
    or length(p_state) > 100 or length(p_postal_code) > 20 then
    raise exception 'Invalid shop details' using errcode = '22023';
  end if;
  insert into public.shops (name, phone, email, address, city, state, postal_code)
    values (btrim(p_name), nullif(btrim(p_phone), ''), nullif(btrim(p_email), ''),
      nullif(btrim(p_address), ''), nullif(btrim(p_city), ''),
      nullif(btrim(p_state), ''), nullif(btrim(p_postal_code), ''))
    returning id into new_shop_id;
  insert into public.shop_members (shop_id, user_id, role)
    values (new_shop_id, caller_id, 'owner');
  return new_shop_id;
end;
$$;
revoke all on function public.create_initial_shop(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_initial_shop(text, text, text, text, text, text, text) to authenticated;
comment on function public.create_initial_shop(text, text, text, text, text, text, text) is
  'Atomic first-shop bootstrap only. Uses auth.uid(), locks that auth user, rejects existing membership, and assigns owner. No client-supplied identity or shop ID.';
