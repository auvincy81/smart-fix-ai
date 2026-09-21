-- Phase 5. All changes are additive; existing Auth and shop records are retained.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.vehicles add constraint vehicles_shop_customer_id_key unique (shop_id, customer_id, id);
alter table public.appointments add constraint appointments_vehicle_customer_fk
  foreign key (shop_id, customer_id, vehicle_id) references public.vehicles(shop_id, customer_id, id) on delete restrict;
alter table public.appointments add constraint appointments_context_key unique (shop_id, customer_id, vehicle_id, id);
alter table public.work_orders add constraint work_orders_vehicle_customer_fk
  foreign key (shop_id, customer_id, vehicle_id) references public.vehicles(shop_id, customer_id, id) on delete restrict;
alter table public.work_orders add constraint work_orders_appointment_context_fk
  foreign key (shop_id, customer_id, vehicle_id, appointment_id)
  references public.appointments(shop_id, customer_id, vehicle_id, id) on delete restrict;
create unique index work_orders_one_per_appointment on public.work_orders (shop_id, appointment_id) where appointment_id is not null;
create index appointments_shop_schedule_idx on public.appointments (shop_id, scheduled_start);
create index work_orders_shop_status_idx on public.work_orders (shop_id, status);

revoke all on public.appointments, public.work_orders from public, anon, authenticated;
grant select on public.appointments, public.work_orders to authenticated;
grant insert (shop_id, customer_id, vehicle_id, scheduled_start, scheduled_end, customer_concern, internal_notes, status)
  on public.appointments to authenticated;
grant update (vehicle_id, scheduled_start, scheduled_end, customer_concern, internal_notes, status)
  on public.appointments to authenticated;
grant insert (shop_id, customer_id, vehicle_id, appointment_id, mileage_in, customer_complaint, assigned_technician_id, technician_notes, status)
  on public.work_orders to authenticated;
grant update (mileage_in, mileage_out, customer_complaint, assigned_technician_id, technician_notes, status)
  on public.work_orders to authenticated;

create policy appointments_read_member on public.appointments for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy appointments_insert_staff on public.appointments for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));
create policy appointments_update_staff on public.appointments for update to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')))
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));
create policy work_orders_read_member on public.work_orders for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy work_orders_insert_staff on public.work_orders for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));
create policy work_orders_update_staff on public.work_orders for update to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')))
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner', 'manager', 'service_advisor')));

-- The counter is private so clients cannot allocate/overwrite numbers themselves.
create table private.work_order_counters (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  last_number bigint not null check (last_number > 0)
);
revoke all on private.work_order_counters from public, anon, authenticated;

create function private.guard_appointment() returns trigger
language plpgsql set search_path = '' as $$
declare linked_status text;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('requested', 'confirmed') then
      raise exception 'Invalid initial appointment status' using errcode = '22023';
    end if;
  else
    if (new.shop_id, new.customer_id, new.id) is distinct from (old.shop_id, old.customer_id, old.id) then
      raise exception 'Appointment context is immutable' using errcode = '22023';
    end if;
    select case when status = 'completed' then 'completed' when status = 'cancelled' then 'cancelled'
      when status = 'draft' then 'checked_in' else 'in_service' end
      into linked_status from public.work_orders where shop_id = new.shop_id and appointment_id = new.id;
    if linked_status is not null then
      if new.vehicle_id is distinct from old.vehicle_id or new.status <> linked_status then
        raise exception 'Manage a linked appointment through its work order' using errcode = '22023';
      end if;
    elsif new.status <> old.status and not (
      (old.status = 'requested' and new.status in ('confirmed', 'checked_in', 'cancelled', 'no_show')) or
      (old.status = 'confirmed' and new.status in ('checked_in', 'cancelled', 'no_show')) or
      (old.status = 'checked_in' and new.status in ('in_service', 'cancelled')) or
      (old.status = 'in_service' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Invalid appointment status transition' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_appointment() from public, anon, authenticated;
create trigger appointments_guard before insert or update on public.appointments
  for each row execute function private.guard_appointment();

-- Definer required for the protected counter and atomic appointment sync.
-- It is a private trigger, not an exposed RPC, and checks authoritative membership.
create function private.guard_work_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare appt public.appointments%rowtype; next_number bigint;
begin
  -- Preserve the schema's FK SET NULL when a technician membership is deleted.
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 and auth.uid() is null
    and old.assigned_technician_id is not null and new.assigned_technician_id is null
    and (to_jsonb(new) - 'assigned_technician_id' - 'updated_at') = (to_jsonb(old) - 'assigned_technician_id' - 'updated_at') then
    return new;
  end if;
  if auth.uid() is null or not exists (select 1 from public.shop_members
    where shop_id = new.shop_id and user_id = auth.uid() and role in ('owner', 'manager', 'service_advisor')) then
    raise exception 'Shop write access required' using errcode = '42501';
  end if;
  if new.assigned_technician_id is not null and not exists (select 1 from public.shop_members
    where id = new.assigned_technician_id and shop_id = new.shop_id and role = 'technician') then
    raise exception 'Choose a technician in this shop' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'open') then
      raise exception 'Invalid initial work order status' using errcode = '22023';
    end if;
    if new.appointment_id is not null then
      select * into appt from public.appointments where id = new.appointment_id and shop_id = new.shop_id for update;
      if not found or appt.customer_id <> new.customer_id or (appt.vehicle_id is not null and appt.vehicle_id <> new.vehicle_id) then
        raise exception 'Appointment context does not match' using errcode = '22023';
      end if;
      if exists (select 1 from public.work_orders where shop_id = new.shop_id and appointment_id = new.appointment_id) then
        raise exception 'Appointment already has a work order' using errcode = '23505';
      end if;
      if appt.status not in ('requested', 'confirmed', 'checked_in') then
        raise exception 'Appointment cannot start a work order' using errcode = '22023';
      end if;
      if appt.vehicle_id is null then
        update public.appointments set vehicle_id = new.vehicle_id where id = appt.id;
      end if;
    end if;
    insert into private.work_order_counters (shop_id, last_number) values (new.shop_id, 1)
      on conflict (shop_id) do update set last_number = private.work_order_counters.last_number + 1
      returning last_number into next_number;
    new.work_order_number := 'WO-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(next_number::text, greatest(6, length(next_number::text)), '0');
    new.opened_at := case when new.status = 'open' then now() else null end;
    new.completed_at := null;
  else
    if (new.shop_id, new.customer_id, new.vehicle_id, new.appointment_id, new.id, new.work_order_number)
      is distinct from (old.shop_id, old.customer_id, old.vehicle_id, old.appointment_id, old.id, old.work_order_number) then
      raise exception 'Work order context is immutable' using errcode = '22023';
    end if;
    if new.status <> old.status and not (
      (new.status = 'cancelled' and old.status not in ('completed', 'cancelled')) or
      (old.status = 'draft' and new.status = 'open') or
      (old.status = 'open' and new.status = 'diagnosing') or
      (old.status = 'diagnosing' and new.status = 'waiting_approval') or
      (old.status = 'waiting_approval' and new.status = 'approved') or
      (old.status = 'approved' and new.status = 'in_progress') or
      (old.status = 'in_progress' and new.status = 'completed')
    ) then
      raise exception 'Invalid work order status transition' using errcode = '22023';
    end if;
    if old.status = 'draft' and new.status = 'open' then new.opened_at := now(); end if;
    if old.status <> 'completed' and new.status = 'completed' then new.completed_at := now(); end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_work_order() from public, anon, authenticated;
create trigger work_orders_guard before insert or update on public.work_orders
  for each row execute function private.guard_work_order();

create function private.sync_work_order_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only a successfully authorized insert/status change can invoke this trigger.
  if new.appointment_id is not null then
    update public.appointments set status = case when new.status = 'completed' then 'completed'
      when new.status = 'cancelled' then 'cancelled' when new.status = 'draft' then 'checked_in' else 'in_service' end
      where id = new.appointment_id and shop_id = new.shop_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_work_order_appointment() from public, anon, authenticated;
create trigger work_orders_sync_appointment after insert or update of status on public.work_orders
  for each row execute function private.sync_work_order_appointment();

-- Minimal technician directory without widening shop_members' own-membership RLS
-- or exposing Auth emails/profile data. Staff display names are a later feature.
create function private.shop_technicians(p_shop_id uuid) returns table(id uuid, label text)
language sql stable security definer set search_path = '' as $$
  select sm.id, 'Technician ' || left(sm.id::text, 8) from public.shop_members sm
  where sm.shop_id = p_shop_id and sm.role = 'technician' and auth.uid() is not null
    and exists (select 1 from public.shop_members caller where caller.user_id = auth.uid() and caller.shop_id = p_shop_id)
  order by sm.id;
$$;
revoke all on function private.shop_technicians(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.shop_technicians(uuid) to authenticated;
create function public.list_shop_technicians(p_shop_id uuid) returns table(id uuid, label text)
language sql stable security invoker set search_path = '' as $$ select * from private.shop_technicians(p_shop_id); $$;
revoke all on function public.list_shop_technicians(uuid) from public, anon, authenticated;
grant execute on function public.list_shop_technicians(uuid) to authenticated;
