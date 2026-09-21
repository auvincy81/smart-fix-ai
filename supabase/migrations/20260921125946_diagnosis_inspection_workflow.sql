-- Additive Phase 6 changes. Existing records and migration history are retained.
alter table public.work_orders add constraint work_orders_vehicle_context_key unique (shop_id, vehicle_id, id);
alter table public.diagnoses add column save_key uuid;
create unique index diagnoses_save_key on public.diagnoses(shop_id, save_key) where save_key is not null;
alter table public.diagnoses add constraint diagnoses_job_vehicle_fk foreign key (shop_id, vehicle_id, work_order_id)
  references public.work_orders(shop_id, vehicle_id, id) on delete restrict;
create index diagnoses_shop_job_created_idx on public.diagnoses(shop_id, work_order_id, created_at desc);
revoke all on public.diagnoses from public, anon, authenticated;
grant select on public.diagnoses to authenticated;
grant insert (shop_id, work_order_id, vehicle_id, technician_id, symptoms, diagnostic_codes, ai_summary, severity, ai_response, save_key)
  on public.diagnoses to authenticated;
grant update (symptoms, diagnostic_codes, technician_findings, confirmed_cause, ai_summary, severity, ai_response)
  on public.diagnoses to authenticated;
create policy diagnoses_read_member on public.diagnoses for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy diagnoses_create_member on public.diagnoses for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid()) and role in ('owner','manager','service_advisor','technician')));
create policy diagnoses_update_member on public.diagnoses for update to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())))
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));

alter table public.inspections
  add column jurisdiction_state text check (jurisdiction_state is null or jurisdiction_state ~ '^[A-Z]{2}$'),
  add column template_key text,
  add column criteria_version text,
  add column readiness_score integer check (readiness_score between 0 and 100),
  add column readiness_result text check (readiness_result in ('incomplete','likely_ready','needs_attention','high_risk')),
  add column readiness_blockers jsonb not null default '[]'::jsonb check (jsonb_typeof(readiness_blockers) = 'array'),
  add column request_key uuid,
  add column updated_at timestamptz not null default now(),
  add constraint inspections_type_check check (inspection_type in ('multipoint','pre_inspection')),
  add constraint inspections_job_vehicle_fk foreign key (shop_id, vehicle_id, work_order_id)
    references public.work_orders(shop_id, vehicle_id, id) on delete restrict;
create unique index inspections_request_key on public.inspections(shop_id, request_key) where request_key is not null;
create index inspections_shop_created_idx on public.inspections(shop_id, created_at desc);
create index inspections_job_idx on public.inspections(work_order_id);
alter table public.inspection_items
  add column required boolean not null default true,
  add column critical boolean not null default false,
  add column weight integer not null default 1 check (weight between 1 and 100),
  add constraint inspection_items_context_key unique (inspection_id, id),
  add constraint inspection_items_text_limits check (char_length(measurement) <= 200 and char_length(technician_note) <= 5000 and char_length(recommendation) <= 5000);
create index inspection_items_parent_idx on public.inspection_items(inspection_id, sort_order);
revoke all on public.inspections, public.inspection_items from public, anon, authenticated;
grant select on public.inspections, public.inspection_items to authenticated;
-- Creation/completion is atomic through scoped RPCs. Only findings are directly writable.
grant update (condition, measurement, technician_note, recommendation) on public.inspection_items to authenticated;
create policy inspections_read_member on public.inspections for select to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy inspections_insert_member on public.inspections for insert to authenticated
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy inspections_update_member on public.inspections for update to authenticated
  using (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())))
  with check (shop_id in (select shop_id from public.shop_members where user_id = (select auth.uid())));
create policy inspection_items_read_parent on public.inspection_items for select to authenticated
  using (inspection_id in (select id from public.inspections));
create policy inspection_items_update_parent on public.inspection_items for update to authenticated
  using (inspection_id in (select id from public.inspections))
  with check (inspection_id in (select id from public.inspections));

-- Versioned definitions, not findings. Each creation copies definitions into items.
create table private.inspection_templates (
  template_key text not null, criteria_version text not null, inspection_type text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  primary key (template_key, criteria_version)
);
alter table private.inspection_templates enable row level security;
revoke all on private.inspection_templates from public, anon, authenticated;
insert into private.inspection_templates values
('mekareports_multipoint','1.0','multipoint', '[
 {"category":"Tires","name":"Front tires: tread, pressure, damage","critical":true,"weight":3},
 {"category":"Tires","name":"Rear tires: tread, pressure, damage","critical":true,"weight":3},
 {"category":"Brakes","name":"Front brakes: pads, rotors, operation","critical":true,"weight":3},
 {"category":"Brakes","name":"Rear brakes and parking brake","critical":true,"weight":3},
 {"category":"Brakes","name":"Brake fluid, hoses, and lines","critical":true,"weight":3},
 {"category":"Steering & Suspension","name":"Steering linkage and operation","critical":true,"weight":3},
 {"category":"Steering & Suspension","name":"Suspension, shocks, and wheel bearings","critical":true,"weight":3},
 {"category":"Exterior Lights","name":"Headlamps, brake lamps, and signals","critical":true,"weight":2},
 {"category":"Battery & Charging","name":"Battery condition and terminals","critical":false,"weight":1},
 {"category":"Battery & Charging","name":"Charging and starting system","critical":false,"weight":1},
 {"category":"Engine / Fluids","name":"Engine oil level and condition","critical":false,"weight":2},
 {"category":"Engine / Fluids","name":"Coolant level and condition","critical":false,"weight":2},
 {"category":"Engine / Fluids","name":"Transmission and other applicable fluids","critical":false,"weight":1},
 {"category":"Leaks","name":"Visible fluid and fuel leaks","critical":true,"weight":3},
 {"category":"Belts & Hoses","name":"Drive belts and accessible hoses","critical":false,"weight":2},
 {"category":"Wipers / Washer","name":"Wiper blades, operation, and washer","critical":false,"weight":1},
 {"category":"Windshield / Glass","name":"Windshield, glass, and mirrors","critical":false,"weight":2},
 {"category":"HVAC","name":"Heating, cooling, and defrost operation","critical":false,"weight":1},
 {"category":"Exhaust","name":"Exhaust mounts, leaks, and condition","critical":true,"weight":2},
 {"category":"Safety Equipment","name":"Seat belts, horn, and visible warning lamps","critical":true,"weight":3},
 {"category":"Road-Test / General Notes","name":"Road test when safe: handling, braking, noises","critical":false,"weight":2},
 {"category":"Road-Test / General Notes","name":"General observations and follow-up","critical":false,"weight":1}
]'::jsonb),
('mekareports_generic_readiness','1.0','pre_inspection', '[
 {"category":"Safety / Emissions Readiness","name":"Check Engine / MIL status","critical":true,"weight":3},
 {"category":"Safety / Emissions Readiness","name":"OBD readiness monitors and scan observations","critical":true,"weight":3},
 {"category":"Tires","name":"Tire tread, inflation, and visible damage","critical":true,"weight":3},
 {"category":"Brakes","name":"Service brakes and parking brake operation","critical":true,"weight":3},
 {"category":"Lights","name":"Headlights","critical":true,"weight":2},
 {"category":"Lights","name":"Brake lights","critical":true,"weight":2},
 {"category":"Lights","name":"Turn signals","critical":false,"weight":2},
 {"category":"Lights","name":"Hazard lights","critical":false,"weight":1},
 {"category":"Visibility / Controls","name":"Horn","critical":false,"weight":1},
 {"category":"Visibility / Controls","name":"Wipers and washer","critical":false,"weight":2},
 {"category":"Visibility / Controls","name":"Windshield condition","critical":true,"weight":2},
 {"category":"Visibility / Controls","name":"Mirrors","critical":false,"weight":1},
 {"category":"Steering / Suspension","name":"Steering condition and operation","critical":true,"weight":3},
 {"category":"Steering / Suspension","name":"Suspension and wheel bearings","critical":true,"weight":3},
 {"category":"Exhaust / Leaks","name":"Exhaust condition and visible emissions observations","critical":true,"weight":3},
 {"category":"Exhaust / Leaks","name":"Visible fluid and fuel leaks","critical":true,"weight":3},
 {"category":"Safety Equipment","name":"Seat belts and other visible safety items","critical":true,"weight":3},
 {"category":"Safety / Emissions Readiness","name":"Emissions-related visual observations and concerns","critical":false,"weight":2}
]'::jsonb);

create function private.assert_inspection_member(p_shop uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.shop_members where shop_id=p_shop and user_id=auth.uid() and role in ('owner','manager','service_advisor','technician')) then
    raise exception 'Shop access required' using errcode='42501';
  end if;
end;
$$;
revoke all on function private.assert_inspection_member(uuid) from public, anon, authenticated;

create function private.recalculate_readiness() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent public.inspections%rowtype; score integer; missing integer; critical_count integer; blockers jsonb;
begin
  select * into parent from public.inspections where id=new.inspection_id for update;
  perform private.assert_inspection_member(parent.shop_id);
  if parent.inspection_type='pre_inspection' then
    select coalesce(round(100.0 * sum(weight * case condition when 'good' then 1.0 when 'attention' then 0.5 else 0 end) / nullif(sum(weight),0)),0)::integer,
      count(*) filter (where required and condition='not_checked'), count(*) filter (where critical and condition='urgent'),
      coalesce(jsonb_agg(jsonb_build_object('item_id',id,'item',item_name,'reason',case when condition='not_checked' then 'Required item not checked' else 'Critical urgent finding' end) order by sort_order)
        filter (where (required and condition='not_checked') or (critical and condition='urgent')), '[]'::jsonb)
      into score, missing, critical_count, blockers from public.inspection_items where inspection_id=parent.id;
    update public.inspections set readiness_score=score, readiness_result=case when missing>0 then 'incomplete' when critical_count>0 then 'high_risk' when score>=85 then 'likely_ready' when score>=65 then 'needs_attention' else 'high_risk' end,
      readiness_blockers=blockers, updated_at=clock_timestamp() where id=parent.id;
  else
    update public.inspections set updated_at=clock_timestamp() where id=parent.id;
  end if;
  return new;
end;
$$;
revoke all on function private.recalculate_readiness() from public, anon, authenticated;
create trigger inspection_items_score after insert or update of condition, measurement, technician_note, recommendation on public.inspection_items
  for each row execute function private.recalculate_readiness();

create function private.guard_inspection_item() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent public.inspections%rowtype;
begin
  select * into parent from public.inspections where id=old.inspection_id for update;
  perform private.assert_inspection_member(parent.shop_id);
  if parent.status='completed' then raise exception 'Completed inspection is a saved snapshot' using errcode='22023'; end if;
  if (new.id,new.inspection_id,new.category,new.item_name,new.weight,new.required,new.critical,new.sort_order)
    is distinct from (old.id,old.inspection_id,old.category,old.item_name,old.weight,old.required,old.critical,old.sort_order) then
    raise exception 'Checklist definition is immutable' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_inspection_item() from public, anon, authenticated;
create trigger inspection_items_guard before update on public.inspection_items for each row execute function private.guard_inspection_item();

create function private.create_inspection(p_work_order uuid, p_type text, p_state text, p_request_key uuid, p_technician uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare job public.work_orders%rowtype; template private.inspection_templates%rowtype; existing public.inspections%rowtype; new_id uuid; definition jsonb; n integer:=0;
begin
  select * into job from public.work_orders where id=p_work_order for update;
  perform private.assert_inspection_member(job.shop_id);
  if p_type is null or p_type not in ('multipoint','pre_inspection') or p_request_key is null then raise exception 'Invalid inspection request' using errcode='22023'; end if;
  if p_technician is not null and not exists(select 1 from public.shop_members where id=p_technician and shop_id=job.shop_id) then raise exception 'Invalid technician' using errcode='22023'; end if;
  select * into existing from public.inspections where shop_id=job.shop_id and request_key=p_request_key;
  if found then
    if existing.work_order_id<>p_work_order or existing.inspection_type<>p_type then raise exception 'Request key already used' using errcode='22023'; end if;
    return existing.id;
  end if;
  select * into strict template from private.inspection_templates where inspection_type=p_type and criteria_version='1.0';
  insert into public.inspections(shop_id,work_order_id,vehicle_id,technician_id,inspection_type,jurisdiction_state,template_key,criteria_version,request_key)
    values(job.shop_id,job.id,job.vehicle_id,p_technician,p_type,case when p_type='pre_inspection' then nullif(p_state,'') else null end,template.template_key,template.criteria_version,p_request_key) returning id into new_id;
  for definition in select value from jsonb_array_elements(template.items) loop
    insert into public.inspection_items(inspection_id,category,item_name,weight,critical,required,sort_order)
      values(new_id,definition->>'category',definition->>'name',(definition->>'weight')::integer,(definition->>'critical')::boolean,true,n);
    n:=n+1;
  end loop;
  return new_id;
end;
$$;
revoke all on function private.create_inspection(uuid,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function private.create_inspection(uuid,text,text,uuid,uuid) to authenticated;
create function public.create_inspection(p_work_order uuid,p_type text,p_state text,p_request_key uuid,p_technician uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.create_inspection(p_work_order,p_type,p_state,p_request_key,p_technician); $$;
revoke all on function public.create_inspection(uuid,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_inspection(uuid,text,text,uuid,uuid) to authenticated;

create function private.save_inspection(p_id uuid,p_updated_at timestamptz,p_items jsonb,p_summary text,p_complete boolean,p_acknowledge_unchecked boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare parent public.inspections%rowtype; item jsonb; total integer;
begin
  select * into parent from public.inspections where id=p_id for update;
  perform private.assert_inspection_member(parent.shop_id);
  if parent.status='completed' then raise exception 'Completed inspection is a saved snapshot' using errcode='22023'; end if;
  if p_updated_at is null or parent.updated_at<>p_updated_at then raise exception 'Inspection changed; reload before saving' using errcode='40001'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>100 or char_length(p_summary)>5000 then raise exception 'Invalid inspection findings' using errcode='22023'; end if;
  select count(*) into total from public.inspection_items where inspection_id=p_id;
  if jsonb_array_length(p_items)<>total or (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>total then raise exception 'Submit each checklist item once' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if item->>'condition' is null or item->>'condition' not in ('good','attention','urgent','not_checked') then raise exception 'Invalid condition' using errcode='22023'; end if;
    update public.inspection_items set condition=item->>'condition',measurement=nullif(item->>'measurement',''),technician_note=nullif(item->>'technician_note',''),recommendation=nullif(item->>'recommendation','')
      where id=(item->>'id')::uuid and inspection_id=p_id;
    if not found then raise exception 'Checklist item does not belong to inspection' using errcode='22023'; end if;
  end loop;
  if p_complete is true and p_acknowledge_unchecked is not true and exists(select 1 from public.inspection_items where inspection_id=p_id and required and condition='not_checked') then
    raise exception 'Confirm unchecked required items before completing' using errcode='22023';
  end if;
  update public.inspections set summary=nullif(p_summary,''),status=case when p_complete is true then 'completed' else 'in_progress' end,
    completed_at=case when p_complete is true then now() else null end,updated_at=clock_timestamp() where id=p_id;
  return p_id;
end;
$$;
revoke all on function private.save_inspection(uuid,timestamptz,jsonb,text,boolean,boolean) from public, anon, authenticated;
grant execute on function private.save_inspection(uuid,timestamptz,jsonb,text,boolean,boolean) to authenticated;
create function public.save_inspection(p_id uuid,p_updated_at timestamptz,p_items jsonb,p_summary text,p_complete boolean,p_acknowledge_unchecked boolean) returns uuid
language sql security invoker set search_path='' as $$ select private.save_inspection(p_id,p_updated_at,p_items,p_summary,p_complete,p_acknowledge_unchecked); $$;
revoke all on function public.save_inspection(uuid,timestamptz,jsonb,text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.save_inspection(uuid,timestamptz,jsonb,text,boolean,boolean) to authenticated;

create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, inspection_id uuid not null, inspection_item_id uuid,
  storage_path text not null unique, caption text check(char_length(caption)<=500),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key(shop_id,inspection_id) references public.inspections(shop_id,id) on delete restrict,
  foreign key(inspection_id,inspection_item_id) references public.inspection_items(inspection_id,id) on delete restrict,
  check(storage_path=shop_id::text || '/' || inspection_id::text || '/' || id::text || '.jpg')
);
alter table public.inspection_photos enable row level security;
create index inspection_photos_parent_idx on public.inspection_photos(inspection_id,created_at);
revoke all on public.inspection_photos from public, anon, authenticated;
grant select on public.inspection_photos to authenticated;
grant insert(id,shop_id,inspection_id,inspection_item_id,storage_path,caption) on public.inspection_photos to authenticated;
create policy inspection_photos_read_member on public.inspection_photos for select to authenticated
  using(shop_id in(select shop_id from public.shop_members where user_id=(select auth.uid())));
create policy inspection_photos_insert_member on public.inspection_photos for insert to authenticated
  with check(created_by=(select auth.uid()) and shop_id in(select shop_id from public.shop_members where user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('inspection-photos','inspection-photos',false,5242880,array['image/jpeg']);
create policy inspection_objects_read_member on storage.objects for select to authenticated
  using(bucket_id='inspection-photos' and exists(select 1 from public.inspections i where i.shop_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2]));
create policy inspection_objects_insert_member on storage.objects for insert to authenticated
  with check(bucket_id='inspection-photos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and exists(select 1 from public.inspections i where i.shop_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2]));
-- Only unregistered objects owned by the caller may be removed for failed-upload cleanup.
create policy inspection_objects_cleanup on storage.objects for delete to authenticated
  using(bucket_id='inspection-photos' and owner_id=(select auth.uid())::text
    and exists(select 1 from public.inspections i where i.shop_id::text=(storage.foldername(name))[1] and i.id::text=(storage.foldername(name))[2])
    and not exists(select 1 from public.inspection_photos p where p.storage_path=name));

create view public.inspection_listing with(security_invoker=true) as
select i.*,w.work_order_number,w.customer_id,c.first_name || ' ' || c.last_name as customer_name,
  nullif(concat_ws(' ',v.year,v.make,v.model),'') as vehicle_name,v.vin
from public.inspections i join public.work_orders w on w.id=i.work_order_id and w.shop_id=i.shop_id
join public.customers c on c.id=w.customer_id and c.shop_id=i.shop_id
join public.vehicles v on v.id=i.vehicle_id and v.shop_id=i.shop_id;
revoke all on public.inspection_listing from public,anon,authenticated;
grant select on public.inspection_listing to authenticated;
