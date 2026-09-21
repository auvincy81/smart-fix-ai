-- Phase 7: additive, local-first repair workflow. No existing records are deleted.
alter table public.work_orders add constraint work_orders_repair_context unique(shop_id,customer_id,vehicle_id,id);
alter table public.diagnoses add constraint diagnoses_repair_context unique(shop_id,work_order_id,id);
alter table public.inspections add constraint inspections_repair_context unique(shop_id,work_order_id,id);
alter table public.service_recommendations
  add column diagnosis_id uuid,
  add column inspection_id uuid,
  add column inspection_item_id uuid,
  add column request_key uuid,
  add constraint recommendations_context unique(shop_id,work_order_id,id),
  add constraint recommendations_job_context foreign key(shop_id,customer_id,vehicle_id,work_order_id) references public.work_orders(shop_id,customer_id,vehicle_id,id),
  add constraint recommendations_diagnosis_context foreign key(shop_id,work_order_id,diagnosis_id) references public.diagnoses(shop_id,work_order_id,id),
  add constraint recommendations_inspection_context foreign key(shop_id,work_order_id,inspection_id) references public.inspections(shop_id,work_order_id,id),
  add constraint recommendations_item_context foreign key(inspection_id,inspection_item_id) references public.inspection_items(inspection_id,id),
  add constraint recommendations_source_check check ((diagnosis_id is null or inspection_id is null) and (inspection_item_id is null or inspection_id is not null));
create unique index recommendations_retry on public.service_recommendations(shop_id,request_key) where request_key is not null;
alter table public.work_order_services
  add column customer_description text,
  add column parts_amount numeric(12,2) not null default 0 check(parts_amount>=0),
  add column fees_amount numeric(12,2) not null default 0 check(fees_amount>=0),
  add column total_amount numeric(12,2) not null default 0 check(total_amount>=0),
  add column completion_note text,
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column sort_order integer not null default 0,
  add column recommendation_id uuid,
  add column request_key uuid,
  add constraint services_context unique(shop_id,work_order_id,id),
  add constraint services_recommendation_context foreign key(shop_id,work_order_id,recommendation_id) references public.service_recommendations(shop_id,work_order_id,id);
create unique index services_recommendation_once on public.work_order_services(recommendation_id) where recommendation_id is not null;
create unique index services_retry on public.work_order_services(shop_id,request_key) where request_key is not null;

create table public.work_order_parts (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null,
  work_order_service_id uuid, part_name text not null check(char_length(part_name) between 1 and 500),
  part_number text, description text, quantity numeric(10,3) not null check(quantity>0),
  unit_cost numeric(12,2) check(unit_cost>=0), unit_price numeric(12,2) not null check(unit_price>=0),
  amount numeric(12,2) generated always as (round(quantity*unit_price,2)) stored,
  status text not null default 'planned' check(status in ('planned','approved','installed','declined')),
  request_key uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(shop_id,request_key), foreign key(shop_id,work_order_id) references public.work_orders(shop_id,id),
  foreign key(shop_id,work_order_id,work_order_service_id) references public.work_order_services(shop_id,work_order_id,id)
);
create index parts_job on public.work_order_parts(shop_id,work_order_id);
create index parts_service on public.work_order_parts(work_order_service_id);
create table public.work_order_estimates (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null,
  estimate_number text not null, version integer not null check(version>0),
  status text not null default 'draft' check(status in ('draft','presented','partially_approved','approved','declined','superseded','void')),
  is_current boolean not null default true, customer_note text, internal_note text,
  labor_total numeric(12,2) not null default 0, parts_total numeric(12,2) not null default 0,
  fees_total numeric(12,2) not null default 0, subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0 check(tax_amount=0),
  grand_total numeric(12,2) not null default 0 check(grand_total>=0),
  customer_snapshot jsonb not null default '{}', presented_at timestamptz, responded_at timestamptz, superseded_at timestamptz,
  created_by uuid references public.shop_members(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(shop_id,estimate_number,version), unique(shop_id,work_order_id,version), unique(shop_id,work_order_id,id),
  foreign key(shop_id,work_order_id) references public.work_orders(shop_id,id)
);
create unique index estimates_current_job on public.work_order_estimates(work_order_id) where is_current;
create table public.work_order_estimate_items (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null, estimate_id uuid not null,
  work_order_service_id uuid not null, line_number integer not null check(line_number>0),
  description text not null, category text, labor_hours numeric(8,2) not null, labor_rate numeric(12,2) not null,
  labor_amount numeric(12,2) not null, parts_amount numeric(12,2) not null, fees_amount numeric(12,2) not null,
  total_amount numeric(12,2) not null, parts_snapshot jsonb not null default '[]',
  decision text not null default 'pending' check(decision in ('pending','approved','declined')), decision_at timestamptz,
  unique(estimate_id,line_number), unique(estimate_id,work_order_service_id),
  foreign key(shop_id,work_order_id,estimate_id) references public.work_order_estimates(shop_id,work_order_id,id),
  foreign key(shop_id,work_order_id,work_order_service_id) references public.work_order_services(shop_id,work_order_id,id)
);
create table public.customer_approval_requests (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null, estimate_id uuid not null,
  token_hash text unique check(token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check(status in ('pending','responded','invalidated')),
  expires_at timestamptz not null, created_at timestamptz not null default now(), responded_at timestamptz,
  unique(shop_id,work_order_id,estimate_id,id),
  foreign key(shop_id,work_order_id,estimate_id) references public.work_order_estimates(shop_id,work_order_id,id)
);
create index approval_requests_estimate on public.customer_approval_requests(estimate_id);
create table public.customer_approval_audits (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null, estimate_id uuid not null,
  approval_request_id uuid not null unique,
  method text not null check(method in ('customer_portal','phone','in_person','sms','email')),
  customer_name text not null check(char_length(customer_name) between 1 and 200), customer_note text,
  acknowledgment text not null, decisions jsonb not null, approved_item_ids uuid[] not null, declined_item_ids uuid[] not null,
  recorded_by uuid references public.shop_members(id) on delete set null, responded_at timestamptz not null default now(),
  foreign key(shop_id,work_order_id,estimate_id,approval_request_id) references public.customer_approval_requests(shop_id,work_order_id,estimate_id,id)
);
create index approval_audits_job on public.customer_approval_audits(shop_id,work_order_id);
create table private.estimate_counters(shop_id uuid primary key references public.shops(id) on delete cascade,last_number bigint not null);
-- A protected, transaction-local capability lets vetted RPCs update job status without impersonating a staff JWT.
create table private.repair_transition_context(transaction_id bigint not null,work_order_id uuid not null,next_status text not null,primary key(transaction_id,work_order_id));
alter table private.estimate_counters enable row level security;
alter table private.repair_transition_context enable row level security;
revoke all on private.estimate_counters,private.repair_transition_context from public,anon,authenticated;

-- All writes are through narrow atomic RPCs. Direct tables retain shop-scoped read RLS.
do $$ declare t text; begin
  foreach t in array array['work_order_services','service_recommendations','work_order_parts','work_order_estimates','work_order_estimate_items','customer_approval_requests','customer_approval_audits'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid())))',t||'_read_shop',t);
    if t not in ('work_order_parts','customer_approval_requests') then execute format('grant select on public.%I to authenticated',t); end if;
  end loop;
end $$;
-- Internal acquisition cost and token hashes are not included in ordinary client projections.
grant select(id,shop_id,work_order_id,work_order_service_id,part_name,part_number,description,quantity,unit_price,amount,status,request_key,created_at,updated_at) on public.work_order_parts to authenticated;
grant select(id,shop_id,work_order_id,estimate_id,status,expires_at,created_at,responded_at) on public.customer_approval_requests to authenticated;

create function private.repair_member(p_shop uuid,p_manage boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare member_id uuid;
begin
  select id into member_id from public.shop_members where shop_id=p_shop and user_id=auth.uid()
    and (not p_manage or role in ('owner','manager','service_advisor'));
  if member_id is null then raise exception 'Shop permission required' using errcode='42501'; end if;
  return member_id;
end $$;
revoke all on function private.repair_member(uuid,boolean) from public,anon,authenticated;

create function private.calculate_service() returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.labor_amount:=round(coalesce(new.labor_hours,0)*coalesce(new.labor_rate,0),2);
  select coalesce(sum(amount),0) into new.parts_amount from public.work_order_parts where work_order_service_id=new.id;
  new.total_amount:=new.labor_amount+new.parts_amount+new.fees_amount;
  return new;
end $$;
revoke all on function private.calculate_service() from public,anon,authenticated;
create trigger services_calculate before insert or update on public.work_order_services for each row execute function private.calculate_service();
create function private.calculate_part_parent() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.work_order_services set updated_at=clock_timestamp() where id=coalesce(new.work_order_service_id,old.work_order_service_id);
  return coalesce(new,old);
end $$;
revoke all on function private.calculate_part_parent() from public,anon,authenticated;
create trigger parts_calculate after insert or update or delete on public.work_order_parts for each row execute function private.calculate_part_parent();
create trigger parts_updated before update on public.work_order_parts for each row execute function public.set_updated_at();

create function private.advance_repair_job(p_job uuid,p_status text,p_mileage integer default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into private.repair_transition_context values(txid_current(),p_job,p_status);
  update public.work_orders set status=p_status,mileage_out=coalesce(p_mileage,mileage_out),
    completed_at=case when p_status='completed' then now() else completed_at end where id=p_job;
  delete from private.repair_transition_context where transaction_id=txid_current() and work_order_id=p_job;
end $$;
revoke all on function private.advance_repair_job(uuid,text,integer) from public,anon,authenticated;

create function private.snapshot_estimate(p_estimate uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.work_order_estimates%rowtype;
begin
  select * into strict e from public.work_order_estimates where id=p_estimate for update;
  if e.status<>'draft' then raise exception 'Revise the presented estimate first' using errcode='22023'; end if;
  delete from public.work_order_estimate_items where estimate_id=e.id;
  insert into public.work_order_estimate_items(shop_id,work_order_id,estimate_id,work_order_service_id,line_number,description,category,labor_hours,labor_rate,labor_amount,parts_amount,fees_amount,total_amount,parts_snapshot)
  select s.shop_id,s.work_order_id,e.id,s.id,row_number() over(order by s.sort_order,s.created_at,s.id),
    coalesce(nullif(s.customer_description,''),s.description),s.service_category,coalesce(s.labor_hours,0),coalesce(s.labor_rate,0),coalesce(s.labor_amount,0),s.parts_amount,s.fees_amount,s.total_amount,
    coalesce((select jsonb_agg(jsonb_build_object('name',p.part_name,'number',p.part_number,'quantity',p.quantity::text,'unit_price',p.unit_price::text,'amount',p.amount::text) order by p.created_at,p.id) from public.work_order_parts p where p.work_order_service_id=s.id),'[]')
    from public.work_order_services s where s.work_order_id=e.work_order_id and s.status='planned';
  update public.work_order_estimates set (labor_total,parts_total,fees_total,subtotal,grand_total)=
    (select coalesce(sum(labor_amount),0),coalesce(sum(parts_amount),0),coalesce(sum(fees_amount),0),coalesce(sum(total_amount),0),coalesce(sum(total_amount),0) from public.work_order_estimate_items where estimate_id=e.id),
    updated_at=clock_timestamp() where id=e.id;
end $$;
revoke all on function private.snapshot_estimate(uuid) from public,anon,authenticated;

create function private.estimate_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if old.presented_at is not null and (to_jsonb(new)-array['status','is_current','responded_at','superseded_at','updated_at']) is distinct from (to_jsonb(old)-array['status','is_current','responded_at','superseded_at','updated_at']) then
    raise exception 'Presented estimate snapshot is immutable' using errcode='22023';
  end if;
  return new;
end $$;
revoke all on function private.estimate_immutable() from public,anon,authenticated;
create trigger estimates_immutable before update on public.work_order_estimates for each row execute function private.estimate_immutable();

create function private.manage_repair(p_job uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.work_orders%rowtype; e public.work_order_estimates%rowtype; s public.work_order_services%rowtype;
  r public.service_recommendations%rowtype; member_id uuid; result_id uuid; source_inspection uuid; source_diagnosis uuid;
  source_item uuid; retry uuid; n bigint; ver integer; number text; raw_token text;
begin
  select * into j from public.work_orders where id=p_job for update;
  member_id:=private.repair_member(j.shop_id,p_action not in ('recommend','future','start','complete_service','complete_job'));
  if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>100000 then raise exception 'Invalid details' using errcode='22023'; end if;
  if exists(select 1 from jsonb_each_text(p_data) where key in ('labor_hours','labor_rate','fees_amount','quantity','unit_cost','unit_price','estimated_cost') and value<>'' and value !~ '^[0-9]+([.][0-9]{1,3})?$') then raise exception 'Use nonnegative decimal amounts' using errcode='22023'; end if;
  if j.status in ('completed','cancelled') and p_action<>'future' then raise exception 'This work order is closed' using errcode='22023'; end if;
  select * into e from public.work_order_estimates where work_order_id=j.id and is_current for update;
  if p_action='recommend' then
    retry:=(p_data->>'request_key')::uuid;
    if retry is null or length(btrim(coalesce(p_data->>'title',''))) not between 1 and 500 then raise exception 'Recommendation title and request key required' using errcode='22023'; end if;
    select id into result_id from public.service_recommendations where shop_id=j.shop_id and request_key=retry and work_order_id=j.id;
    if result_id is not null then return jsonb_build_object('id',result_id); end if;
    source_diagnosis:=nullif(p_data->>'diagnosis_id','')::uuid; source_inspection:=nullif(p_data->>'inspection_id','')::uuid; source_item:=nullif(p_data->>'inspection_item_id','')::uuid;
    if source_item is not null then
      select i.inspection_id into source_inspection from public.inspection_items i join public.inspections parent on parent.id=i.inspection_id
        where i.id=source_item and parent.shop_id=j.shop_id and parent.work_order_id=j.id and i.condition in ('attention','urgent');
      if source_inspection is null then raise exception 'Choose an attention or urgent finding on this job' using errcode='22023'; end if;
    end if;
    insert into public.service_recommendations(shop_id,customer_id,vehicle_id,work_order_id,title,description,priority,estimated_cost,recommended_date,recommended_mileage,diagnosis_id,inspection_id,inspection_item_id,request_key)
      values(j.shop_id,j.customer_id,j.vehicle_id,j.id,btrim(p_data->>'title'),p_data->>'description',coalesce(p_data->>'priority','medium'),nullif(p_data->>'estimated_cost','')::numeric,nullif(p_data->>'recommended_date','')::date,nullif(p_data->>'recommended_mileage','')::integer,source_diagnosis,source_inspection,source_item,retry) returning id into result_id;
  elsif p_action='future' then
    select * into r from public.service_recommendations where id=(p_data->>'id')::uuid and work_order_id=j.id for update;
    if r.id is null or r.status='completed' or exists(select 1 from public.work_order_services where recommendation_id=r.id and status in ('approved','in_progress','completed')) then raise exception 'Only unperformed recommendations can be deferred' using errcode='22023'; end if;
    if nullif(p_data->>'recommended_date','') is null and nullif(p_data->>'recommended_mileage','') is null then raise exception 'Enter a future service date or mileage' using errcode='22023'; end if;
    update public.service_recommendations set recommended_date=nullif(p_data->>'recommended_date','')::date,recommended_mileage=nullif(p_data->>'recommended_mileage','')::integer,status='recommended' where id=r.id;
    result_id:=r.id;
  elsif p_action in ('service','part','from_recommendation') then
    if (e.id is not null and e.status<>'draft') or j.status not in ('open','diagnosing','waiting_approval','approved') then raise exception 'Create a new estimate revision before changing repair lines' using errcode='22023'; end if;
    if p_action='from_recommendation' then
      select * into r from public.service_recommendations where id=(p_data->>'id')::uuid and work_order_id=j.id;
      if r.id is null or r.status='completed' then raise exception 'Recommendation not available for this job' using errcode='22023'; end if;
      select id into result_id from public.work_order_services where recommendation_id=r.id;
      if result_id is null then insert into public.work_order_services(shop_id,work_order_id,description,customer_description,recommendation_id,labor_hours,labor_rate)
        values(j.shop_id,j.id,r.title,r.description,r.id,0,0) returning id into result_id; end if;
    elsif p_action='service' then
      if length(btrim(coalesce(p_data->>'description',''))) not between 1 and 500 then raise exception 'Service description required' using errcode='22023'; end if;
      result_id:=nullif(p_data->>'id','')::uuid;
      if result_id is null then
        retry:=(p_data->>'request_key')::uuid;
        if retry is null then raise exception 'Request key required' using errcode='22023'; end if;
        select id into result_id from public.work_order_services where shop_id=j.shop_id and request_key=retry and work_order_id=j.id;
        if result_id is not null then return jsonb_build_object('id',result_id); end if;
        insert into public.work_order_services(shop_id,work_order_id,description,request_key) values(j.shop_id,j.id,btrim(p_data->>'description'),retry) returning id into result_id;
      end if;
      select * into s from public.work_order_services where id=result_id and work_order_id=j.id and status='planned' for update;
      if s.id is null then raise exception 'Editable service not found' using errcode='22023'; end if;
      update public.work_order_services set description=btrim(p_data->>'description'),customer_description=p_data->>'customer_description',service_category=p_data->>'category',
        labor_hours=coalesce(nullif(p_data->>'labor_hours','')::numeric,0),labor_rate=coalesce(nullif(p_data->>'labor_rate','')::numeric,0),fees_amount=coalesce(nullif(p_data->>'fees_amount','')::numeric,0),
        technician_id=nullif(p_data->>'technician_id','')::uuid,sort_order=coalesce((p_data->>'sort_order')::integer,0) where id=s.id;
    else
      select * into s from public.work_order_services where id=(p_data->>'service_id')::uuid and work_order_id=j.id and status='planned' for update;
      if s.id is null then raise exception 'Choose an editable service on this job' using errcode='22023'; end if;
      result_id:=nullif(p_data->>'id','')::uuid;
      if result_id is null then
        retry:=(p_data->>'request_key')::uuid;
        select id into result_id from public.work_order_parts where shop_id=j.shop_id and request_key=retry and work_order_id=j.id;
        if result_id is not null then return jsonb_build_object('id',result_id); end if;
        insert into public.work_order_parts(shop_id,work_order_id,work_order_service_id,part_name,part_number,description,quantity,unit_cost,unit_price,request_key)
          values(j.shop_id,j.id,s.id,btrim(p_data->>'part_name'),p_data->>'part_number',p_data->>'description',(p_data->>'quantity')::numeric,nullif(p_data->>'unit_cost','')::numeric,(p_data->>'unit_price')::numeric,retry) returning id into result_id;
      else
        update public.work_order_parts set part_name=btrim(p_data->>'part_name'),part_number=p_data->>'part_number',description=p_data->>'description',quantity=(p_data->>'quantity')::numeric,
          unit_price=(p_data->>'unit_price')::numeric,unit_cost=case when p_data?'unit_cost' then nullif(p_data->>'unit_cost','')::numeric else unit_cost end
          where id=result_id and work_order_service_id=s.id and status='planned';
        if not found then raise exception 'Editable part not found' using errcode='22023'; end if;
      end if;
    end if;
    if e.id is not null then perform private.snapshot_estimate(e.id); end if;
  elsif p_action in ('draft','revise') then
    if j.status not in ('open','diagnosing','waiting_approval','approved') or exists(select 1 from public.work_order_services where work_order_id=j.id and status in ('in_progress','completed')) then raise exception 'Cannot revise after repair work has started' using errcode='22023'; end if;
    if p_action='draft' and e.id is not null then return jsonb_build_object('id',e.id); end if;
    if e.id is null then
      insert into private.estimate_counters values(j.shop_id,1) on conflict(shop_id) do update set last_number=private.estimate_counters.last_number+1 returning last_number into n;
      number:='EST-'||to_char(now() at time zone 'UTC','YYYY')||'-'||lpad(n::text,greatest(6,length(n::text)),'0'); ver:=1;
    else
      number:=e.estimate_number; ver:=e.version+1;
      update public.work_order_estimates set is_current=false,superseded_at=now(),status=case when status in ('draft','presented') then 'superseded' else status end where id=e.id;
      update public.customer_approval_requests set status='invalidated' where estimate_id=e.id and status='pending';
      update public.work_order_services set status='planned' where work_order_id=j.id;
      update public.work_order_parts set status='planned' where work_order_id=j.id;
      if j.status in ('approved','waiting_approval') then perform private.advance_repair_job(j.id,'open'); end if;
    end if;
    insert into public.work_order_estimates(shop_id,work_order_id,estimate_number,version,customer_note,internal_note,created_by)
      values(j.shop_id,j.id,number,ver,e.customer_note,e.internal_note,member_id) returning id into result_id;
    perform private.snapshot_estimate(result_id);
  elsif p_action='estimate_notes' then
    if e.id is null or e.status<>'draft' then raise exception 'Editable draft required' using errcode='22023'; end if;
    update public.work_order_estimates set customer_note=p_data->>'customer_note',internal_note=p_data->>'internal_note',updated_at=clock_timestamp() where id=e.id;
    result_id:=e.id;
  elsif p_action in ('present','approval_link') then
    if e.id is null or (p_action='present' and e.status<>'draft') or (p_action='approval_link' and e.status<>'presented') then raise exception 'Estimate is not available for this action' using errcode='22023'; end if;
    if p_action='present' then
      perform private.snapshot_estimate(e.id);
      if (select count(*) from public.work_order_estimate_items where estimate_id=e.id) not between 1 and 100 then raise exception 'Present between one and 100 services' using errcode='22023'; end if;
      update public.work_order_estimates set customer_snapshot=(select jsonb_build_object('shop_name',sh.name,'shop_phone',sh.phone,'shop_email',sh.email,'customer_name',c.first_name||' '||c.last_name,'vehicle',concat_ws(' ',v.year,v.make,v.model),'vin',v.vin,'mileage',j.mileage_in,'work_order',j.work_order_number) from public.shops sh join public.customers c on c.id=j.customer_id join public.vehicles v on v.id=j.vehicle_id where sh.id=j.shop_id),
        status='presented',presented_at=now(),updated_at=clock_timestamp() where id=e.id;
      perform private.advance_repair_job(j.id,'waiting_approval');
    end if;
    update public.customer_approval_requests set status='invalidated' where estimate_id=e.id and status='pending';
    raw_token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.customer_approval_requests(shop_id,work_order_id,estimate_id,token_hash,expires_at)
      values(j.shop_id,j.id,e.id,encode(extensions.digest(raw_token,'sha256'),'hex'),now()+interval '7 days');
    return jsonb_build_object('id',e.id,'token',raw_token);
  elsif p_action='start' then
    if j.status not in ('approved','in_progress') or e.id is null or e.status not in ('approved','partially_approved') then raise exception 'Resolved customer authorization required' using errcode='22023'; end if;
    select * into s from public.work_order_services where id=(p_data->>'id')::uuid and work_order_id=j.id and status='approved' for update;
    if s.id is null then raise exception 'Only an approved service can start' using errcode='22023'; end if;
    update public.work_order_services set status='in_progress',started_at=now(),technician_id=coalesce(technician_id,member_id) where id=s.id;
    if j.status='approved' then perform private.advance_repair_job(j.id,'in_progress'); end if;
    result_id:=s.id;
  elsif p_action='complete_service' then
    select * into s from public.work_order_services where id=(p_data->>'id')::uuid and work_order_id=j.id and status='in_progress' for update;
    if j.status<>'in_progress' or s.id is null or length(btrim(coalesce(p_data->>'completion_note',''))) not between 1 and 5000 then raise exception 'An in-progress approved repair and completion note are required' using errcode='22023'; end if;
    update public.work_order_services set status='completed',completed_at=now(),completion_note=btrim(p_data->>'completion_note'),technician_id=member_id where id=s.id;
    update public.work_order_parts set status='installed' where work_order_service_id=s.id and status='approved';
    update public.service_recommendations set status='completed' where id=s.recommendation_id;
    result_id:=s.id;
  elsif p_action='complete_job' then
    if j.status<>'in_progress' or e.id is null or e.status not in ('approved','partially_approved') or exists(select 1 from public.work_order_estimate_items where estimate_id=e.id and decision='pending')
      or exists(select 1 from public.work_order_services where work_order_id=j.id and status not in ('completed','declined'))
      or not exists(select 1 from public.work_order_services where work_order_id=j.id and status='completed') then raise exception 'Resolve customer decisions and complete every approved service first' using errcode='22023'; end if;
    n:=(p_data->>'mileage_out')::bigint;
    if n is null or n<0 or n>2147483647 or n<coalesce(j.mileage_in,0) then raise exception 'Mileage out must be valid and at least mileage in' using errcode='22023'; end if;
    perform private.advance_repair_job(j.id,'completed',n::integer);
    update public.vehicles set mileage=n::integer where id=j.vehicle_id and (mileage is null or mileage<n);
    result_id:=j.id;
  else raise exception 'Unsupported repair action' using errcode='22023';
  end if;
  return jsonb_build_object('id',result_id);
end $$;
revoke all on function private.manage_repair(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function private.manage_repair(uuid,text,jsonb) to authenticated;
create function public.manage_repair(p_job uuid,p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.manage_repair(p_job,p_action,p_data); $$;
revoke all on function public.manage_repair(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_repair(uuid,text,jsonb) to authenticated;

-- A token is a narrow capability, never a shop session. No database IDs or internal fields leave this projection.
create function private.approval_payload(p_estimate uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select e.customer_snapshot || jsonb_build_object('estimate_number',e.estimate_number,'version',e.version,'status',e.status,'customer_note',e.customer_note,
    'labor_total',e.labor_total::text,'parts_total',e.parts_total::text,'fees_total',e.fees_total::text,'grand_total',e.grand_total::text,'pre_tax',true,
    'items',coalesce((select jsonb_agg(jsonb_build_object('line',i.line_number,'description',i.description,'category',i.category,'labor_hours',i.labor_hours::text,
      'labor_rate',i.labor_rate::text,'labor_amount',i.labor_amount::text,'parts_amount',i.parts_amount::text,'fees_amount',i.fees_amount::text,
      'total_amount',i.total_amount::text,'parts',i.parts_snapshot,'decision',i.decision) order by i.line_number) from public.work_order_estimate_items i where i.estimate_id=e.id),'[]'))
  from public.work_order_estimates e where e.id=p_estimate;
$$;
revoke all on function private.approval_payload(uuid) from public,anon,authenticated;

create function private.read_customer_approval(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.customer_approval_requests%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select req.* into r from public.customer_approval_requests req join public.work_order_estimates e on e.id=req.estimate_id
    where req.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and req.status in ('pending','responded') and req.expires_at>now()
    and e.is_current and e.status in ('presented','approved','partially_approved','declined');
  if r.id is null then return null; end if;
  return private.approval_payload(r.estimate_id)||jsonb_build_object('request_status',r.status,'expires_at',r.expires_at);
end $$;
revoke all on function private.read_customer_approval(text) from public,anon,authenticated;
grant usage on schema private to anon;
grant execute on function private.read_customer_approval(text) to anon,authenticated;
create function public.read_customer_approval(p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.read_customer_approval(p_token);$$;
revoke all on function public.read_customer_approval(text) from public,anon,authenticated;
grant execute on function public.read_customer_approval(text) to anon,authenticated;

create function private.record_approval(p_request uuid,p_decisions jsonb,p_name text,p_note text,p_ack boolean,p_method text,p_member uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.customer_approval_requests%rowtype; e public.work_order_estimates%rowtype; item jsonb; approved integer; declined integer; total integer;
begin
  -- Callers lock the work order first. Re-check expiry/status under locks to prevent replay and revision races.
  select * into r from public.customer_approval_requests where id=p_request for update;
  select * into e from public.work_order_estimates where id=r.estimate_id for update;
  if r.id is null or r.status<>'pending' or r.expires_at<=now() or not e.is_current or e.status<>'presented' then raise exception 'Approval request unavailable' using errcode='22023'; end if;
  if p_ack is not true or length(btrim(coalesce(p_name,''))) not between 1 and 200 or length(coalesce(p_note,''))>5000 or p_decisions is null or jsonb_typeof(p_decisions)<>'array' then raise exception 'Name, authorization acknowledgment, and all decisions are required' using errcode='22023'; end if;
  select count(*) into total from public.work_order_estimate_items where estimate_id=e.id;
  if total=0 or total>100 or jsonb_array_length(p_decisions)<>total or (select count(distinct value->>'line') from jsonb_array_elements(p_decisions))<>total then raise exception 'Choose each repair once' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_decisions) loop
    if item->>'decision' is null or item->>'decision' not in ('approved','declined') then raise exception 'Approve or decline every repair before submitting' using errcode='22023'; end if;
    update public.work_order_estimate_items set decision=item->>'decision',decision_at=now() where estimate_id=e.id and line_number=(item->>'line')::integer and decision='pending';
    if not found then raise exception 'Repair does not belong to this estimate' using errcode='22023'; end if;
  end loop;
  select count(*) filter(where decision='approved'),count(*) filter(where decision='declined') into approved,declined from public.work_order_estimate_items where estimate_id=e.id;
  insert into public.customer_approval_audits(shop_id,work_order_id,estimate_id,approval_request_id,method,customer_name,customer_note,acknowledgment,decisions,approved_item_ids,declined_item_ids,recorded_by)
    select r.shop_id,r.work_order_id,e.id,r.id,p_method,btrim(p_name),p_note,'I authorize only the repairs I approved at the displayed pre-tax prices.',
      jsonb_agg(jsonb_build_object('item_id',id,'line',line_number,'decision',decision) order by line_number),
      coalesce(array_agg(id) filter(where decision='approved'),'{}'::uuid[]),coalesce(array_agg(id) filter(where decision='declined'),'{}'::uuid[]),p_member
      from public.work_order_estimate_items where estimate_id=e.id;
  update public.work_order_services s set status=i.decision from public.work_order_estimate_items i where i.estimate_id=e.id and i.work_order_service_id=s.id;
  update public.work_order_parts p set status=i.decision from public.work_order_estimate_items i where i.estimate_id=e.id and i.work_order_service_id=p.work_order_service_id;
  update public.service_recommendations r2 set status=case when i.decision='approved' then 'scheduled' else 'declined' end from public.work_order_estimate_items i join public.work_order_services s on s.id=i.work_order_service_id where i.estimate_id=e.id and r2.id=s.recommendation_id;
  update public.work_order_estimates set status=case when approved=total then 'approved' when declined=total then 'declined' else 'partially_approved' end,responded_at=now(),updated_at=clock_timestamp() where id=e.id;
  update public.customer_approval_requests set status='responded',responded_at=now() where id=r.id;
  update public.customer_approval_requests set status='invalidated' where estimate_id=e.id and id<>r.id and status='pending';
  perform private.advance_repair_job(r.work_order_id,case when approved>0 then 'approved' else 'open' end);
end $$;
revoke all on function private.record_approval(uuid,jsonb,text,text,boolean,text,uuid) from public,anon,authenticated;

create function private.submit_customer_approval(p_token text,p_decisions jsonb,p_name text,p_note text,p_ack boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.customer_approval_requests%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Approval request unavailable' using errcode='22023'; end if;
  select * into r from public.customer_approval_requests where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if r.id is null then raise exception 'Approval request unavailable' using errcode='22023'; end if;
  perform 1 from public.work_orders where id=r.work_order_id for update;
  perform private.record_approval(r.id,p_decisions,p_name,p_note,p_ack,'customer_portal',null);
  return true;
end $$;
revoke all on function private.submit_customer_approval(text,jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function private.submit_customer_approval(text,jsonb,text,text,boolean) to anon,authenticated;
create function public.submit_customer_approval(p_token text,p_decisions jsonb,p_name text,p_note text,p_ack boolean) returns boolean language sql security invoker set search_path='' as $$select private.submit_customer_approval(p_token,p_decisions,p_name,p_note,p_ack);$$;
revoke all on function public.submit_customer_approval(text,jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function public.submit_customer_approval(text,jsonb,text,text,boolean) to anon,authenticated;

create function private.record_staff_approval(p_estimate uuid,p_decisions jsonb,p_name text,p_note text,p_ack boolean,p_method text) returns boolean
language plpgsql security definer set search_path='' as $$
declare e public.work_order_estimates%rowtype; member_id uuid; req uuid;
begin
  select * into e from public.work_order_estimates where id=p_estimate;
  member_id:=private.repair_member(e.shop_id,true);
  if p_method is null or p_method not in ('phone','in_person') then raise exception 'Use phone or in-person authorization' using errcode='22023'; end if;
  perform 1 from public.work_orders where id=e.work_order_id for update;
  insert into public.customer_approval_requests(shop_id,work_order_id,estimate_id,expires_at) values(e.shop_id,e.work_order_id,e.id,now()+interval '1 hour') returning id into req;
  perform private.record_approval(req,p_decisions,p_name,p_note,p_ack,p_method,member_id);
  return true;
end $$;
revoke all on function private.record_staff_approval(uuid,jsonb,text,text,boolean,text) from public,anon,authenticated;
grant execute on function private.record_staff_approval(uuid,jsonb,text,text,boolean,text) to authenticated;
create function public.record_staff_approval(p_estimate uuid,p_decisions jsonb,p_name text,p_note text,p_ack boolean,p_method text) returns boolean language sql security invoker set search_path='' as $$select private.record_staff_approval(p_estimate,p_decisions,p_name,p_note,p_ack,p_method);$$;
revoke all on function public.record_staff_approval(uuid,jsonb,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_staff_approval(uuid,jsonb,text,text,boolean,text) to authenticated;

-- Preserve the Phase 5 guard and add protected Phase 7 transitions.
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
        (old.status in ('open','diagnosing') and new.status='waiting_approval') or
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
