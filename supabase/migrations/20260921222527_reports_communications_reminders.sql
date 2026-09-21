-- Phase 8 is additive. Existing clinical, authorization, and repair records remain untouched.
alter table public.repair_reports add column finalized_at timestamptz,
  add constraint reports_context unique(shop_id,work_order_id,id),
  add constraint reports_job_context foreign key(shop_id,customer_id,vehicle_id,work_order_id) references public.work_orders(shop_id,customer_id,vehicle_id,id);
create unique index reports_one_active_job on public.repair_reports(work_order_id) where report_status<>'void';

create table private.document_counters (
  shop_id uuid not null references public.shops(id) on delete cascade,
  kind text not null check(kind in ('RPT','INV','RCT')), last_number bigint not null, primary key(shop_id,kind)
);
alter table private.document_counters enable row level security;
revoke all on private.document_counters from public,anon,authenticated;
create table public.work_order_invoices (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null,
  customer_id uuid not null, vehicle_id uuid not null, invoice_number text not null,
  status text not null default 'draft' check(status in ('draft','issued','partially_paid','paid','void')),
  labor_total numeric(12,2) not null, parts_total numeric(12,2) not null, fees_total numeric(12,2) not null,
  subtotal numeric(12,2) not null check(subtotal>=0), tax_amount numeric(12,2) not null default 0 check(tax_amount=0),
  total numeric(12,2) not null check(total>=0), amount_paid numeric(12,2) not null default 0 check(amount_paid>=0 and amount_paid<=total),
  balance_due numeric(12,2) generated always as (total-amount_paid) stored,
  customer_note text, snapshot jsonb not null, issued_at timestamptz, paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(shop_id,invoice_number), unique(shop_id,work_order_id,id),
  foreign key(shop_id,customer_id,vehicle_id,work_order_id) references public.work_orders(shop_id,customer_id,vehicle_id,id)
);
create unique index invoices_one_active_job on public.work_order_invoices(work_order_id) where status<>'void';
create table public.work_order_payments (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null, invoice_id uuid not null,
  amount numeric(12,2) not null check(amount>0), payment_method text not null check(payment_method in ('cash','card','check','bank_transfer','other')),
  payment_reference text check(length(payment_reference)<=80), note text check(length(note)<=500),
  paid_at timestamptz not null default now(), recorded_by uuid references public.shop_members(id) on delete set null,
  request_key uuid not null, created_at timestamptz not null default now(), unique(shop_id,request_key), unique(shop_id,work_order_id,invoice_id,id),
  foreign key(shop_id,work_order_id,invoice_id) references public.work_order_invoices(shop_id,work_order_id,id)
);
create table public.work_order_receipts (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, work_order_id uuid not null, invoice_id uuid not null,
  payment_id uuid not null unique, receipt_number text not null, snapshot jsonb not null, created_at timestamptz not null default now(),
  unique(shop_id,receipt_number), foreign key(shop_id,work_order_id,invoice_id,payment_id) references public.work_order_payments(shop_id,work_order_id,invoice_id,id)
);
create table public.customer_document_links (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, customer_id uuid not null, vehicle_id uuid, work_order_id uuid,
  document_type text not null check(document_type in ('repair_report','invoice','receipt','inspection','pre_inspection','diagnosis','estimate','recommendation','service_reminder','appointment_reminder')),
  document_id uuid not null, snapshot jsonb not null, token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check(status in ('active','revoked')), expires_at timestamptz not null,
  created_by uuid references public.shop_members(id) on delete set null, created_at timestamptz not null default now(),
  unique(shop_id,id), foreign key(shop_id,customer_id) references public.customers(shop_id,id),
  foreign key(shop_id,vehicle_id) references public.vehicles(shop_id,id), foreign key(shop_id,work_order_id) references public.work_orders(shop_id,id)
);
create table public.customer_communications (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null, customer_id uuid not null, vehicle_id uuid, work_order_id uuid,
  document_link_id uuid, approval_request_id uuid references public.customer_approval_requests(id),
  channel text not null check(channel in ('email','sms')),
  type text not null check(type in ('estimate','approval_request','diagnosis','repair_report','invoice','receipt','inspection','pre_inspection','recommendation','service_reminder','appointment_reminder','general')),
  recipient text not null, subject text not null, message text not null,
  status text not null default 'draft' check(status in ('draft','queued','sent','delivered','failed')),
  provider text, provider_message_id text, error_message text, sent_at timestamptz, delivered_at timestamptz,
  attempt_id uuid, request_key uuid not null, created_by uuid references public.shop_members(id) on delete set null,
  created_at timestamptz not null default now(), unique(shop_id,request_key),
  check ((document_link_id is not null)::integer+(approval_request_id is not null)::integer=1),
  foreign key(shop_id,document_link_id) references public.customer_document_links(shop_id,id),
  foreign key(shop_id,customer_id) references public.customers(shop_id,id),
  foreign key(shop_id,vehicle_id) references public.vehicles(shop_id,id), foreign key(shop_id,work_order_id) references public.work_orders(shop_id,id)
);
create index invoices_customer on public.work_order_invoices(shop_id,customer_id,vehicle_id);
create index payments_invoice on public.work_order_payments(invoice_id);
create index receipts_job on public.work_order_receipts(shop_id,work_order_id);
create index document_links_source on public.customer_document_links(shop_id,document_type,document_id);
create index communications_customer on public.customer_communications(shop_id,customer_id,created_at desc);

-- Financial documents and communication metadata are restricted to staff managing customer records.
do $$ declare t text; begin
  foreach t in array array['repair_reports','work_order_invoices','work_order_payments','work_order_receipts','customer_document_links','customer_communications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (shop_id in (select shop_id from public.shop_members where user_id=(select auth.uid()) %s))',t||'_read_shop',t,case when t='repair_reports' then '' else 'and role in (''owner'',''manager'',''service_advisor'')' end);
    if t not in ('customer_document_links','customer_communications') then execute format('grant select on public.%I to authenticated',t); end if;
  end loop;
end $$;
grant select(id,shop_id,customer_id,vehicle_id,work_order_id,document_type,document_id,status,expires_at,created_at) on public.customer_document_links to authenticated;
grant select(id,shop_id,customer_id,vehicle_id,work_order_id,document_link_id,approval_request_id,channel,type,recipient,subject,message,status,provider,provider_message_id,error_message,sent_at,delivered_at,created_by,created_at) on public.customer_communications to authenticated;

create function private.document_number(p_shop uuid,p_kind text) returns text language plpgsql security definer set search_path='' as $$
declare n bigint; initial bigint:=0;
begin
  if p_kind='RPT' then select coalesce(max(substring(report_number from '[0-9]+$')::bigint),0) into initial from public.repair_reports where shop_id=p_shop and report_number ~ '^RPT-[0-9]{4}-[0-9]+$'; end if;
  insert into private.document_counters values(p_shop,p_kind,initial+1) on conflict(shop_id,kind) do update set last_number=private.document_counters.last_number+1 returning last_number into n;
  return p_kind||'-'||to_char(now() at time zone 'UTC','YYYY')||'-'||lpad(n::text,greatest(6,length(n::text)),'0');
end $$;

-- The only public document format: customer-safe scalar fields and explicitly selected section rows.
create function private.document_context(p_shop uuid,p_customer uuid,p_vehicle uuid,p_job uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('shop',s.name,'contact',concat_ws(' | ',s.phone,s.email,s.address,s.city,s.state,s.postal_code),
    'customer',c.first_name||' '||c.last_name,'vehicle',concat_ws(' ',v.year,v.make,v.model),'vin',coalesce(v.vin,''),
    'work_order',coalesce(j.work_order_number,''),'mileage_in',coalesce(j.mileage_in::text,''),'mileage_out',coalesce(j.mileage_out::text,''))
  from public.shops s join public.customers c on c.shop_id=s.id and c.id=p_customer
  left join public.vehicles v on v.shop_id=s.id and v.id=p_vehicle
  left join public.work_orders j on j.shop_id=s.id and j.id=p_job where s.id=p_shop;
$$;
create function private.document_row(p_label text,p_value text) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('label',p_label,'value',coalesce(p_value,'Not recorded'));$$;
create function private.document_section(p_title text,p_rows jsonb) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('title',p_title,'rows',coalesce(p_rows,'[]'::jsonb));$$;
create function private.inspection_document_sections(p_inspection uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_array(private.document_section('Inspection results',jsonb_build_array(
  private.document_row('Type',i.inspection_type),private.document_row('Completed',i.completed_at::text),private.document_row('Summary',i.summary),
  private.document_row('Readiness',concat_ws(' | ',i.readiness_result,i.readiness_score::text)),
  private.document_row('Scope','Shop observations only; not an official government inspection or certification.'))),
  private.document_section('Checklist',(select jsonb_agg(private.document_row(item_name,concat_ws(' | ',condition,measurement,recommendation)) order by sort_order,id) from public.inspection_items where inspection_id=i.id)))
from public.inspections i where i.id=p_inspection and i.status='completed';
$$;
create function private.repair_report_snapshot(p_job uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('kind','repair_report','title','Final Repair Report','number','','status','draft','as_of',now()::text,
 'context',private.document_context(j.shop_id,j.customer_id,j.vehicle_id,j.id),'sections',jsonb_build_array(
 private.document_section('Visit',jsonb_build_array(private.document_row('Complaint',j.customer_complaint),private.document_row('Visit date',coalesce(a.scheduled_start,j.opened_at,j.created_at)::text),private.document_row('Completed',j.completed_at::text))),
 private.document_section('Diagnosis summaries',(select jsonb_agg(private.document_row('AI-assisted diagnosis',ai_summary) order by created_at,id) from public.diagnoses where work_order_id=j.id)),
 private.document_section('Customer authorization',(select jsonb_agg(private.document_row(i.description,i.decision) order by i.line_number) from public.work_order_estimate_items i join public.work_order_estimates e on e.id=i.estimate_id where e.work_order_id=j.id and e.is_current)),
 private.document_section('Services performed',(select jsonb_agg(private.document_row(coalesce(nullif(customer_description,''),description),completion_note) order by sort_order,created_at,id) from public.work_order_services where work_order_id=j.id and status='completed')),
 private.document_section('Parts installed',(select jsonb_agg(private.document_row(part_name,concat_ws(' | ',part_number,quantity::text||' installed')) order by created_at,id) from public.work_order_parts where work_order_id=j.id and status='installed')),
 private.document_section('Future recommendations',(select jsonb_agg(private.document_row(title,concat_ws(' | ',description,priority,'Date: '||recommended_date::text,'Mileage: '||recommended_mileage::text,'Estimated USD (pre-tax): '||estimated_cost::text,status)) order by created_at,id) from public.service_recommendations where work_order_id=j.id and status in ('recommended','declined')))
 || coalesce((select jsonb_agg(private.document_section(case when i.inspection_type='pre_inspection' then 'Completed pre-inspection' else 'Completed inspection' end,
 (private.inspection_document_sections(i.id)->0->'rows')||(private.inspection_document_sections(i.id)->1->'rows')) order by i.completed_at,i.id) from public.inspections i where i.work_order_id=j.id and i.status='completed'),'[]'::jsonb)))
from public.work_orders j left join public.appointments a on a.id=j.appointment_id where j.id=p_job and j.status='completed';
$$;
create function private.invoice_snapshot(p_job uuid,p_number text) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('kind','invoice','title','Invoice','number',p_number,'status','draft','as_of',now()::text,'context',private.document_context(j.shop_id,j.customer_id,j.vehicle_id,j.id),
 'sections',jsonb_build_array(private.document_section('Completed authorized repairs',
 (select jsonb_agg(private.document_row(coalesce(nullif(s.customer_description,''),s.description),concat_ws(' | ','Labor USD '||s.labor_amount::text,'Parts USD '||s.parts_amount::text,'Fees USD '||s.fees_amount::text,'Total USD '||s.total_amount::text)) order by s.sort_order,s.created_at,s.id) from public.work_order_services s where s.work_order_id=j.id and s.status='completed')),
 private.document_section('Installed parts',(select jsonb_agg(private.document_row(part_name,quantity::text||' x USD '||unit_price::text||' = USD '||amount::text) order by created_at,id) from public.work_order_parts where work_order_id=j.id and status='installed'))))
from public.work_orders j where j.id=p_job and j.status='completed';
$$;

create function private.financial_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='repair_reports' then
   if old.report_status in ('final','void') and (to_jsonb(new)-'report_status') is distinct from (to_jsonb(old)-'report_status') then raise exception 'Final report is immutable' using errcode='22023'; end if;
 elsif old.status<>'draft' and (to_jsonb(new)-array['status','amount_paid','balance_due','paid_at','updated_at']) is distinct from (to_jsonb(old)-array['status','amount_paid','balance_due','paid_at','updated_at']) then
   raise exception 'Issued invoice is immutable' using errcode='22023';
 end if; return new;
end $$;
create trigger reports_immutable before update on public.repair_reports for each row execute function private.financial_immutable();
create trigger invoices_immutable before update on public.work_order_invoices for each row execute function private.financial_immutable();

create function private.manage_document(p_kind text,p_id uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.work_orders%rowtype; r public.repair_reports%rowtype; i public.work_order_invoices%rowtype; p public.work_order_payments%rowtype;
 member_id uuid; result_id uuid; number text; snap jsonb; amount numeric(12,2); receipt_id uuid;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>10000 then raise exception 'Invalid details' using errcode='22023'; end if;
 if p_kind='repair_report' and p_action<>'create' then select * into r from public.repair_reports where id=p_id; p_id:=r.work_order_id;
 elsif p_kind='invoice' and p_action<>'create' then select * into i from public.work_order_invoices where id=p_id; p_id:=i.work_order_id; end if;
 select * into j from public.work_orders where id=p_id for update;
 member_id:=private.repair_member(j.shop_id,true);
 if r.id is not null then select * into r from public.repair_reports where id=r.id for update; end if;
 if i.id is not null then select * into i from public.work_order_invoices where id=i.id for update; end if;
 if j.status<>'completed' then raise exception 'Complete the work order first' using errcode='22023'; end if;
 if p_kind='repair_report' then
   if p_action='create' then
     select id into result_id from public.repair_reports where work_order_id=j.id and report_status<>'void';
     if result_id is not null then return jsonb_build_object('id',result_id); end if;
     number:=private.document_number(j.shop_id,'RPT'); snap:=private.repair_report_snapshot(j.id)||jsonb_build_object('number',number);
     insert into public.repair_reports(shop_id,work_order_id,customer_id,vehicle_id,report_number,report_snapshot,generated_at) values(j.shop_id,j.id,j.customer_id,j.vehicle_id,number,snap,now()) returning id into result_id;
   elsif p_action='finalize' and r.report_status='draft' then
     update public.repair_reports set report_status='final',finalized_at=now(),report_snapshot=report_snapshot||jsonb_build_object('status','final','as_of',now()::text) where id=r.id; result_id:=r.id;
   elsif p_action='void' and r.report_status='final' then
     update public.repair_reports set report_status='void' where id=r.id;
     update public.customer_document_links set status='revoked' where document_type=p_kind and document_id=r.id; result_id:=r.id;
   else raise exception 'Report action unavailable' using errcode='22023'; end if;
 elsif p_kind='invoice' then
   if p_action='create' then
     select id into result_id from public.work_order_invoices where work_order_id=j.id and status<>'void';
     if result_id is not null then return jsonb_build_object('id',result_id); end if;
     if not exists(select 1 from public.work_order_services where work_order_id=j.id and status='completed') then raise exception 'No completed repair lines to invoice' using errcode='22023'; end if;
     number:=private.document_number(j.shop_id,'INV'); snap:=private.invoice_snapshot(j.id,number);
     insert into public.work_order_invoices(shop_id,work_order_id,customer_id,vehicle_id,invoice_number,labor_total,parts_total,fees_total,subtotal,total,snapshot)
       select j.shop_id,j.id,j.customer_id,j.vehicle_id,number,sum(labor_amount),sum(parts_amount),sum(fees_amount),sum(total_amount),sum(total_amount),snap from public.work_order_services where work_order_id=j.id and status='completed' returning id into result_id;
   elsif p_action='issue' and i.status='draft' then
     update public.work_order_invoices set status='issued',issued_at=now(),updated_at=now(),snapshot=snapshot||jsonb_build_object('status','issued','as_of',now()::text) where id=i.id; result_id:=i.id;
   elsif p_action='payment' then
     select * into p from public.work_order_payments where shop_id=j.shop_id and request_key=(p_data->>'request_key')::uuid;
     if p.id is not null then
       if p.invoice_id<>i.id then raise exception 'Payment request belongs to another invoice' using errcode='22023'; end if;
       select id into receipt_id from public.work_order_receipts where payment_id=p.id;
       return jsonb_build_object('id',i.id,'receipt_id',receipt_id);
     end if;
     if i.status not in ('issued','partially_paid') or p_data->>'amount' is null or p_data->>'amount' !~ '^[0-9]{1,10}([.][0-9]{1,2})?$' then raise exception 'Enter a valid payment for an issued invoice' using errcode='22023'; end if;
     amount:=(p_data->>'amount')::numeric;
     if amount<=0 or amount>i.balance_due then raise exception 'Payment must be positive and cannot exceed the balance due' using errcode='22023'; end if;
     if length(regexp_replace(coalesce(p_data->>'payment_reference','')||coalesce(p_data->>'note',''),'[^0-9]','','g'))>=12 or coalesce(p_data->>'note','') ~* '(cvv|cvc|password|routing number|account number)' then raise exception 'Do not store card numbers, security codes, or banking credentials' using errcode='22023'; end if;
     insert into public.work_order_payments(shop_id,work_order_id,invoice_id,amount,payment_method,payment_reference,note,recorded_by,request_key) values(j.shop_id,j.id,i.id,amount,p_data->>'method',nullif(p_data->>'payment_reference',''),nullif(p_data->>'note',''),member_id,(p_data->>'request_key')::uuid) returning * into p;
     update public.work_order_invoices set amount_paid=amount_paid+amount,status=case when amount_paid+amount=total then 'paid' else 'partially_paid' end,paid_at=case when amount_paid+amount=total then now() else null end,updated_at=now() where id=i.id returning * into i;
     number:=private.document_number(j.shop_id,'RCT');
     snap:=jsonb_build_object('kind','receipt','title','Payment Receipt','number',number,'status','recorded','as_of',now()::text,'context',i.snapshot->'context','sections',jsonb_build_array(private.document_section('Recorded payment',jsonb_build_array(private.document_row('Invoice',i.invoice_number),private.document_row('Amount paid (USD)',p.amount::text),private.document_row('Method',p.payment_method),private.document_row('Payment date',p.paid_at::text),private.document_row('Remaining balance (USD)',i.balance_due::text),private.document_row('Payment handling','Payment recorded manually by shop staff. MekaReports did not process this payment.')))));
     insert into public.work_order_receipts(shop_id,work_order_id,invoice_id,payment_id,receipt_number,snapshot) values(j.shop_id,j.id,i.id,p.id,number,snap) returning id into receipt_id;
     return jsonb_build_object('id',i.id,'receipt_id',receipt_id);
   elsif p_action='void' and i.status in ('draft','issued') and i.amount_paid=0 then
     update public.work_order_invoices set status='void',updated_at=now() where id=i.id;
     update public.customer_document_links set status='revoked' where document_type=p_kind and document_id=i.id; result_id:=i.id;
   else raise exception 'Invoice action unavailable' using errcode='22023'; end if;
 else raise exception 'Unknown document' using errcode='22023'; end if;
 return jsonb_build_object('id',result_id);
end $$;

-- Resolve a single source into a whitelisted snapshot. Never accept caller-provided snapshot/context data.
create function private.document_source(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare shop uuid; customer uuid; vehicle uuid; job uuid; snap jsonb; sections jsonb; number text:=''; label text; state text; e public.work_order_estimates%rowtype;
begin
 if p_kind='repair_report' then select shop_id,customer_id,vehicle_id,work_order_id,report_snapshot into shop,customer,vehicle,job,snap from public.repair_reports where id=p_id and report_status='final';
 elsif p_kind='invoice' then
   select shop_id,customer_id,vehicle_id,work_order_id,snapshot||jsonb_build_object('status',status,'as_of',now()::text,'sections',(snapshot->'sections')||jsonb_build_array(private.document_section('Invoice totals (USD, pre-tax)',jsonb_build_array(private.document_row('Labor',labor_total::text),private.document_row('Parts',parts_total::text),private.document_row('Fees',fees_total::text),private.document_row('Subtotal',subtotal::text),private.document_row('Tax','Not applied; pre-tax invoice'),private.document_row('Total',total::text),private.document_row('Recorded payments',amount_paid::text),private.document_row('Balance due',balance_due::text)))))
   into shop,customer,vehicle,job,snap from public.work_order_invoices where id=p_id and status in ('issued','partially_paid','paid');
 elsif p_kind='receipt' then
   select r.shop_id,i.customer_id,i.vehicle_id,r.work_order_id,r.snapshot into shop,customer,vehicle,job,snap from public.work_order_receipts r join public.work_order_invoices i on i.id=r.invoice_id where r.id=p_id;
 elsif p_kind in ('inspection','pre_inspection') then
   select i.shop_id,j.customer_id,i.vehicle_id,i.work_order_id,private.inspection_document_sections(i.id) into shop,customer,vehicle,job,sections from public.inspections i join public.work_orders j on j.id=i.work_order_id where i.id=p_id and i.status='completed' and i.inspection_type=case when p_kind='inspection' then 'multipoint' else 'pre_inspection' end;
   label:=case when p_kind='inspection' then 'Inspection Report' else 'Pre-Inspection Report' end; state:='completed';
 elsif p_kind='diagnosis' then
   select d.shop_id,j.customer_id,d.vehicle_id,d.work_order_id,jsonb_build_array(private.document_section('AI-assisted diagnosis',jsonb_build_array(private.document_row('Symptoms',d.symptoms),private.document_row('Codes',d.diagnostic_codes),private.document_row('Summary',d.ai_summary),private.document_row('Severity',d.severity),private.document_row('Scope','AI-assisted findings require verification by your mechanic.')))) into shop,customer,vehicle,job,sections from public.diagnoses d join public.work_orders j on j.id=d.work_order_id where d.id=p_id;
   label:='Diagnosis Report'; state:='saved';
 elsif p_kind in ('recommendation','service_reminder') then
   select r.shop_id,r.customer_id,r.vehicle_id,r.work_order_id,jsonb_build_array(private.document_section('Service recommendation',jsonb_build_array(private.document_row('Title',r.title),private.document_row('Description',r.description),private.document_row('Priority',r.priority),private.document_row('Recommended date',r.recommended_date::text),private.document_row('Recommended mileage',r.recommended_mileage::text),private.document_row('Estimated USD (pre-tax)',r.estimated_cost::text),private.document_row('Status',r.status)))) into shop,customer,vehicle,job,sections from public.service_recommendations r where r.id=p_id;
   label:=case when p_kind='recommendation' then 'Service Recommendation' else 'Service Reminder' end; state:='as recorded';
 elsif p_kind='appointment_reminder' then
   select a.shop_id,a.customer_id,a.vehicle_id,jsonb_build_array(private.document_section('Appointment',jsonb_build_array(private.document_row('Scheduled',a.scheduled_start::text),private.document_row('Status',a.status),private.document_row('Visit','Contact the shop to confirm or reschedule.')))) into shop,customer,vehicle,sections from public.appointments a where a.id=p_id and a.status in ('scheduled','confirmed');
   label:='Appointment Reminder'; state:='scheduled';
 elsif p_kind in ('estimate','approval_request') then
   select * into e from public.work_order_estimates where id=p_id and presented_at is not null and status not in ('void','superseded');
   select e.shop_id,j.customer_id,j.vehicle_id,j.id into shop,customer,vehicle,job from public.work_orders j where j.id=e.work_order_id;
   if p_kind='approval_request' and (not e.is_current or e.status<>'presented') then raise exception 'Estimate is not awaiting authorization' using errcode='22023'; end if;
   number:=e.estimate_number||' v'||e.version; label:='Repair Estimate'; state:=e.status;
   sections:=jsonb_build_array(private.document_section('Repair decisions',(select jsonb_agg(private.document_row(description,concat_ws(' | ',decision,'Labor USD '||labor_amount::text,'Parts USD '||parts_amount::text,'Fees USD '||fees_amount::text,'Total USD '||total_amount::text)) order by line_number) from public.work_order_estimate_items where estimate_id=e.id)),private.document_section('Estimate',jsonb_build_array(private.document_row('Customer note',e.customer_note),private.document_row('Full estimate (USD, pre-tax)',e.grand_total::text))));
   snap:=jsonb_build_object('kind',p_kind,'title',label,'number',number,'status',state,'as_of',e.presented_at::text,'context',jsonb_build_object('shop',e.customer_snapshot->>'shop_name','contact',concat_ws(' | ',e.customer_snapshot->>'shop_phone',e.customer_snapshot->>'shop_email'),'customer',e.customer_snapshot->>'customer_name','vehicle',e.customer_snapshot->>'vehicle','vin',coalesce(e.customer_snapshot->>'vin',''),'work_order',e.customer_snapshot->>'work_order','mileage_in',coalesce(e.customer_snapshot->>'mileage',''),'mileage_out',''),'sections',sections);
 else raise exception 'Unsupported document type' using errcode='22023'; end if;
 if shop is null then raise exception 'Document unavailable' using errcode='22023'; end if;
 if snap is null then snap:=jsonb_build_object('kind',p_kind,'title',label,'number',number,'status',state,'as_of',now()::text,'context',private.document_context(shop,customer,vehicle,job),'sections',sections); end if;
 return jsonb_build_object('shop_id',shop,'customer_id',customer,'vehicle_id',vehicle,'work_order_id',job,'snapshot',snap);
end $$;

create function private.create_document_link(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare source jsonb; token text; result_id uuid; member_id uuid;
begin
 source:=private.document_source(p_kind,p_id); member_id:=private.repair_member((source->>'shop_id')::uuid,true);
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.customer_document_links(shop_id,customer_id,vehicle_id,work_order_id,document_type,document_id,snapshot,token_hash,expires_at,created_by)
 values((source->>'shop_id')::uuid,(source->>'customer_id')::uuid,(source->>'vehicle_id')::uuid,(source->>'work_order_id')::uuid,p_kind,p_id,source->'snapshot',encode(extensions.digest(token,'sha256'),'hex'),now()+interval '30 days',member_id) returning id into result_id;
 return jsonb_build_object('id',result_id,'token',token);
end $$;
create function private.read_customer_document(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select snapshot from public.customer_document_links where p_token ~ '^[0-9a-f]{64}$' and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='active' and expires_at>now();
$$;
create function private.revoke_document_link(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare shop uuid;
begin select shop_id into shop from public.customer_document_links where id=p_id; perform private.repair_member(shop,true); update public.customer_document_links set status='revoked' where id=p_id; end $$;

create function private.prepare_communication(p_kind text,p_id uuid,p_channel text,p_recipient text,p_message text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare source jsonb; member_id uuid; link jsonb; token text; result_id uuid; approval_id uuid;
begin
 source:=private.document_source(p_kind,p_id); member_id:=private.repair_member((source->>'shop_id')::uuid,true);
 if p_channel not in ('email','sms') or p_channel is null or p_request is null or length(coalesce(p_message,''))>2000 or length(coalesce(p_recipient,'')) not between 3 and 254 or p_recipient ~ '[\r\n]' then raise exception 'Review channel, recipient, and message' using errcode='22023'; end if;
 if (p_channel='email' and p_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') or (p_channel='sms' and p_recipient !~ '^\+[1-9][0-9]{7,14}$') then raise exception 'Use a valid email or international +country-code phone number' using errcode='22023'; end if;
 -- Retry keys protect creation. Existing drafts remain visible; intentionally create a new preview if the raw link was lost.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into result_id from public.customer_communications where shop_id=(source->>'shop_id')::uuid and request_key=p_request;
 if result_id is not null then return jsonb_build_object('id',result_id,'existing',true); end if;
 if p_kind='approval_request' then
   link:=private.manage_repair((source->>'work_order_id')::uuid,'approval_link','{}'); token:=link->>'token';
   select id into approval_id from public.customer_approval_requests where token_hash=encode(extensions.digest(token,'sha256'),'hex');
 else link:=private.create_document_link(p_kind,p_id); token:=link->>'token'; end if;
 insert into public.customer_communications(shop_id,customer_id,vehicle_id,work_order_id,document_link_id,approval_request_id,channel,type,recipient,subject,message,created_by,request_key)
 values((source->>'shop_id')::uuid,(source->>'customer_id')::uuid,(source->>'vehicle_id')::uuid,(source->>'work_order_id')::uuid,case when approval_id is null then (link->>'id')::uuid end,approval_id,p_channel,p_kind,btrim(p_recipient),(source->'snapshot'->'context'->>'shop')||' - '||(source->'snapshot'->>'title'),coalesce(p_message,''),member_id,p_request) returning id into result_id;
 return jsonb_build_object('id',result_id,'token',token,'path',case when approval_id is null then '/documents/' else '/approve/' end||token);
end $$;
create function private.claim_communication(p_id uuid,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.customer_communications%rowtype; attempt uuid;
begin
 select * into c from public.customer_communications where id=p_id for update; perform private.repair_member(c.shop_id,true);
 if c.status<>'draft' then raise exception 'This message has already been attempted; review history before preparing another' using errcode='22023'; end if;
 if c.document_link_id is not null then
   if not exists(select 1 from public.customer_document_links where id=c.document_link_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and status='active' and expires_at>now()) then raise exception 'Document link unavailable; prepare a new message' using errcode='22023'; end if;
 elsif not exists(select 1 from public.customer_approval_requests a join public.work_order_estimates e on e.id=a.estimate_id where a.id=c.approval_request_id and a.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and a.status='pending' and a.expires_at>now() and e.is_current and e.status='presented') then raise exception 'Approval link unavailable' using errcode='22023'; end if;
 if c.channel='sms' then update public.customer_communications set error_message='SMS provider not configured. Message has not been sent.' where id=c.id; return jsonb_build_object('unconfigured',true); end if;
 attempt:=gen_random_uuid(); update public.customer_communications set status='queued',provider='local_mailpit',attempt_id=attempt where id=c.id;
 return jsonb_build_object('attempt',attempt,'recipient',c.recipient,'subject',c.subject,'message',c.message,'path',case when c.document_link_id is null then '/approve/' else '/documents/' end||p_token);
end $$;
create function private.finish_communication(p_id uuid,p_attempt uuid,p_success boolean,p_provider_id text) returns void language plpgsql security definer set search_path='' as $$
declare c public.customer_communications%rowtype;
begin
 select * into c from public.customer_communications where id=p_id for update; perform private.repair_member(c.shop_id,true);
 if c.status<>'queued' or c.attempt_id is distinct from p_attempt or p_attempt is null then raise exception 'Message attempt unavailable' using errcode='22023'; end if;
 if p_success is true and length(coalesce(p_provider_id,'')) not between 1 and 200 then raise exception 'Provider confirmation required' using errcode='22023'; end if;
 update public.customer_communications set status=case when p_success is true then 'sent' else 'failed' end,provider_message_id=case when p_success is true then p_provider_id end,
 sent_at=case when p_success is true then now() end,error_message=case when p_success is true then 'Local Mailpit capture only; not internet delivery.' else 'Local email was not confirmed. Check Mailpit before preparing another message.' end,attempt_id=null where id=c.id;
end $$;

-- Date and mileage are evaluated independently; unknown mileage never implies overdue.
create view public.service_reminder_readiness with (security_invoker=true) as
select r.*,c.first_name||' '||c.last_name as customer_name,concat_ws(' ',v.year,v.make,v.model) as vehicle_name,v.mileage as known_mileage,
 case when r.recommended_date is null then 'not_set' when r.recommended_date<current_date then 'overdue' when r.recommended_date=current_date then 'due' else 'upcoming' end as date_state,
 case when r.recommended_mileage is null then 'not_set' when v.mileage is null then 'unknown' when v.mileage>=r.recommended_mileage then 'due' else 'upcoming' end as mileage_state,
 case when r.status<>'recommended' then 'inactive' when r.recommended_date<current_date then 'overdue' when r.recommended_date=current_date or v.mileage>=r.recommended_mileage then 'due' when r.recommended_date>current_date or v.mileage<r.recommended_mileage then 'upcoming' else 'unknown' end as due_state
from public.service_recommendations r join public.customers c on c.id=r.customer_id and c.shop_id=r.shop_id join public.vehicles v on v.id=r.vehicle_id and v.shop_id=r.shop_id;
revoke all on public.service_reminder_readiness from public,anon,authenticated;
grant select on public.service_reminder_readiness to authenticated;

-- Explicit grants: helpers remain private; only narrow wrappers are exposed through PostgREST.
do $$ declare signature regprocedure; begin
 for signature in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('document_number','document_context','document_row','document_section','inspection_document_sections','repair_report_snapshot','invoice_snapshot','financial_immutable','manage_document','document_source','create_document_link','read_customer_document','revoke_document_link','prepare_communication','claim_communication','finish_communication') loop execute format('revoke all on function %s from public,anon,authenticated',signature); end loop;
end $$;
create function public.manage_document(p_kind text,p_id uuid,p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.manage_document(p_kind,p_id,p_action,p_data);$$;
create function public.preview_document(p_kind text,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$declare s jsonb; begin s:=private.staff_document_source(p_kind,p_id); return s; end $$;
create function private.staff_document_source(p_kind text,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare s jsonb; begin s:=private.document_source(p_kind,p_id); perform private.repair_member((s->>'shop_id')::uuid,true); return s->'snapshot'; end $$;
revoke all on function private.staff_document_source(text,uuid) from public,anon,authenticated;
create function public.create_document_link(p_kind text,p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.create_document_link(p_kind,p_id);$$;
create function public.read_customer_document(p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.read_customer_document(p_token);$$;
create function public.revoke_document_link(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.revoke_document_link(p_id);$$;
create function public.prepare_communication(p_kind text,p_id uuid,p_channel text,p_recipient text,p_message text,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select private.prepare_communication(p_kind,p_id,p_channel,p_recipient,p_message,p_request);$$;
create function public.claim_communication(p_id uuid,p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.claim_communication(p_id,p_token);$$;
create function public.finish_communication(p_id uuid,p_attempt uuid,p_success boolean,p_provider_id text) returns void language sql security invoker set search_path='' as $$select private.finish_communication(p_id,p_attempt,p_success,p_provider_id);$$;
do $$ declare signature regprocedure; begin
 for signature in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('manage_document','preview_document','create_document_link','read_customer_document','revoke_document_link','prepare_communication','claim_communication','finish_communication') loop
 execute format('revoke all on function %s from public,anon,authenticated',signature); execute format('grant execute on function %s to authenticated',signature); end loop;
end $$;
grant execute on function private.manage_document(text,uuid,text,jsonb),private.staff_document_source(text,uuid),private.create_document_link(text,uuid),private.revoke_document_link(uuid),private.prepare_communication(text,uuid,text,text,text,uuid),private.claim_communication(uuid,text),private.finish_communication(uuid,uuid,boolean,text) to authenticated;
grant execute on function private.read_customer_document(text),public.read_customer_document(text) to authenticated,anon;
