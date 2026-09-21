-- Appointment reminders reuse the existing requested/confirmed statuses.
create or replace function private.document_source(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
   select a.shop_id,a.customer_id,a.vehicle_id,jsonb_build_array(private.document_section('Appointment',jsonb_build_array(private.document_row('Scheduled',a.scheduled_start::text),private.document_row('Status',a.status),private.document_row('Visit','Contact the shop to confirm or reschedule.')))) into shop,customer,vehicle,sections from public.appointments a where a.id=p_id and a.status in ('requested','confirmed');
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
