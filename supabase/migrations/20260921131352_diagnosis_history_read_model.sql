create view public.diagnosis_listing with(security_invoker=true) as
select d.*, w.customer_id, w.work_order_number
from public.diagnoses d join public.work_orders w on w.id=d.work_order_id and w.shop_id=d.shop_id;
revoke all on public.diagnosis_listing from public,anon,authenticated;
grant select on public.diagnosis_listing to authenticated;
