-- Preserve existing active-job states and nullable staff references without weakening client transition guards.
create or replace function private.estimate_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  -- Preserve only the FK-driven removal of a deleted staff reference; the customer snapshot stays frozen.
  if pg_trigger_depth()>1 and old.created_by is not null and new.created_by is null
    and (to_jsonb(new)-array['created_by','updated_at'])=(to_jsonb(old)-array['created_by','updated_at']) then
    return new;
  end if;
  if old.presented_at is not null and (to_jsonb(new)-array['status','is_current','responded_at','superseded_at','updated_at']) is distinct from (to_jsonb(old)-array['status','is_current','responded_at','superseded_at','updated_at']) then
    raise exception 'Presented estimate snapshot is immutable' using errcode='22023';
  end if;
  return new;
end $$;

create or replace function private.guard_work_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare appt public.appointments%rowtype; next_number bigint;
begin
  -- Preserve the schema's FK SET NULL when a technician membership is deleted.
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 and auth.uid() is null
    and old.assigned_technician_id is not null and new.assigned_technician_id is null
    and (to_jsonb(new) - 'assigned_technician_id' - 'updated_at') = (to_jsonb(old) - 'assigned_technician_id' - 'updated_at') then
    return new;
  end if;
  if tg_op='UPDATE' then
    if exists(select 1 from private.repair_transition_context where transaction_id=txid_current() and work_order_id=old.id and next_status=new.status) then
      if (to_jsonb(new)-array['status','mileage_out','completed_at','updated_at']) is distinct from (to_jsonb(old)-array['status','mileage_out','completed_at','updated_at']) or not (
        (old.status in ('open','diagnosing','waiting_approval','approved') and new.status='waiting_approval') or
        (old.status='waiting_approval' and new.status in ('approved','open')) or
        (old.status='approved' and new.status in ('open','in_progress')) or
        (old.status='in_progress' and new.status='completed')) then
        raise exception 'Invalid protected repair transition' using errcode='22023';
      end if;
      return new;
    end if;
    if old.status='completed' then raise exception 'Completed work order is locked' using errcode='22023'; end if;
    if new.status<>old.status and (exists(select 1 from public.work_order_services where work_order_id=old.id) or exists(select 1 from public.work_order_estimates where work_order_id=old.id)) then
      raise exception 'Use the estimate and repair workflow to change this job status' using errcode='22023';
    end if;
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
