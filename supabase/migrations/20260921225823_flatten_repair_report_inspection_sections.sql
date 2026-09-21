-- Flatten completed inspection sections beside the other report sections.
-- Existing final snapshots remain immutable; this corrects future generation only.
create or replace function private.repair_report_snapshot(p_job uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('kind','repair_report','title','Final Repair Report','number','','status','draft','as_of',now()::text,
 'context',private.document_context(j.shop_id,j.customer_id,j.vehicle_id,j.id),'sections',jsonb_build_array(
 private.document_section('Visit',jsonb_build_array(private.document_row('Complaint',j.customer_complaint),private.document_row('Visit date',coalesce(a.scheduled_start,j.opened_at,j.created_at)::text),private.document_row('Completed',j.completed_at::text))),
 private.document_section('Diagnosis summaries',(select jsonb_agg(private.document_row('AI-assisted diagnosis',ai_summary) order by created_at,id) from public.diagnoses where work_order_id=j.id)),
 private.document_section('Customer authorization',(select jsonb_agg(private.document_row(i.description,i.decision) order by i.line_number) from public.work_order_estimate_items i join public.work_order_estimates e on e.id=i.estimate_id where e.work_order_id=j.id and e.is_current)),
 private.document_section('Services performed',(select jsonb_agg(private.document_row(coalesce(nullif(customer_description,''),description),completion_note) order by sort_order,created_at,id) from public.work_order_services where work_order_id=j.id and status='completed')),
 private.document_section('Parts installed',(select jsonb_agg(private.document_row(part_name,concat_ws(' | ',part_number,quantity::text||' installed')) order by created_at,id) from public.work_order_parts where work_order_id=j.id and status='installed')),
 private.document_section('Future recommendations',(select jsonb_agg(private.document_row(title,concat_ws(' | ',description,priority,'Date: '||recommended_date::text,'Mileage: '||recommended_mileage::text,'Estimated USD (pre-tax): '||estimated_cost::text,status)) order by created_at,id) from public.service_recommendations where work_order_id=j.id and status in ('recommended','declined'))))
 || coalesce((select jsonb_agg(private.document_section(case when i.inspection_type='pre_inspection' then 'Completed pre-inspection' else 'Completed inspection' end,
 (private.inspection_document_sections(i.id)->0->'rows')||(private.inspection_document_sections(i.id)->1->'rows')) order by i.completed_at,i.id) from public.inspections i where i.work_order_id=j.id and i.status='completed'),'[]'::jsonb))
from public.work_orders j left join public.appointments a on a.id=j.appointment_id where j.id=p_job and j.status='completed';
$$;
