-- The private BEFORE INSERT trigger always replaces this placeholder. A default
-- lets generated client types correctly omit the database-generated number.
alter table public.work_orders alter column work_order_number set default '';

-- Invoker views preserve every underlying table's RLS. They support search
-- across customer, VIN, vehicle and job text without copying customer data.
create view public.appointment_listing with (security_invoker = true) as
select a.*, c.first_name || ' ' || c.last_name as customer_name,
  nullif(concat_ws(' ', v.year, v.make, v.model), '') as vehicle_name, v.vin
from public.appointments a
join public.customers c on c.id = a.customer_id and c.shop_id = a.shop_id
left join public.vehicles v on v.id = a.vehicle_id and v.shop_id = a.shop_id;
create view public.work_order_listing with (security_invoker = true) as
select w.*, c.first_name || ' ' || c.last_name as customer_name,
  nullif(concat_ws(' ', v.year, v.make, v.model), '') as vehicle_name, v.vin
from public.work_orders w
join public.customers c on c.id = w.customer_id and c.shop_id = w.shop_id
join public.vehicles v on v.id = w.vehicle_id and v.shop_id = w.shop_id;
revoke all on public.appointment_listing, public.work_order_listing from public, anon, authenticated;
grant select on public.appointment_listing, public.work_order_listing to authenticated;
