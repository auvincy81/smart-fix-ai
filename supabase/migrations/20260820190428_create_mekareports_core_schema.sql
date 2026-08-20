-- MekaReports Phase 2 core schema.
-- RLS is intentionally enabled without policies. Phase 3 will connect shop_members.user_id
-- to Supabase Auth and add shop-scoped authorization policies.
-- Shop-scoped composite foreign keys prevent cross-shop relational references.

create extension if not exists pgcrypto;

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  user_id uuid not null,
  role text not null check (role in ('owner', 'manager', 'service_advisor', 'technician')),
  created_at timestamptz not null default now(),
  constraint shop_members_shop_user_key unique (shop_id, user_id),
  constraint shop_members_shop_id_id_key unique (shop_id, id)
);
comment on column public.shop_members.user_id is
  'Application user identifier. The auth.users foreign key and authorization policies will be added in Phase 3.';

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_shop_id_id_key unique (shop_id, id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid not null,
  vin text,
  year integer check (year is null or year between 1886 and 9999),
  make text,
  model text,
  trim text,
  engine text,
  license_plate text,
  plate_state text,
  color text,
  mileage integer check (mileage is null or mileage >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_shop_id_id_key unique (shop_id, id),
  constraint vehicles_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid not null,
  vehicle_id uuid,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  customer_concern text,
  internal_notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_shop_id_id_key unique (shop_id, id),
  constraint appointments_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict,
  constraint appointments_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict,
  constraint appointments_schedule_order check (scheduled_end is null or scheduled_end >= scheduled_start)
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid not null,
  vehicle_id uuid not null,
  appointment_id uuid,
  work_order_number text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'diagnosing', 'waiting_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  mileage_in integer check (mileage_in is null or mileage_in >= 0),
  mileage_out integer check (mileage_out is null or mileage_out >= 0),
  customer_complaint text,
  technician_notes text,
  assigned_technician_id uuid,
  opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_shop_number_key unique (shop_id, work_order_number),
  constraint work_orders_shop_id_id_key unique (shop_id, id),
  constraint work_orders_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict,
  constraint work_orders_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict,
  constraint work_orders_appointment_fk foreign key (shop_id, appointment_id)
    references public.appointments(shop_id, id) on delete set null (appointment_id),
  constraint work_orders_technician_fk foreign key (shop_id, assigned_technician_id)
    references public.shop_members(shop_id, id) on delete set null (assigned_technician_id),
  constraint work_orders_mileage_order check (mileage_out is null or mileage_in is null or mileage_out >= mileage_in)
);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  work_order_id uuid not null,
  vehicle_id uuid not null,
  technician_id uuid,
  symptoms text,
  diagnostic_codes text,
  technician_findings text,
  confirmed_cause text,
  ai_summary text,
  severity text check (severity is null or severity in ('stop_driving', 'drive_to_shop', 'monitor')),
  ai_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diagnoses_shop_id_id_key unique (shop_id, id),
  constraint diagnoses_work_order_fk foreign key (shop_id, work_order_id)
    references public.work_orders(shop_id, id) on delete restrict,
  constraint diagnoses_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict,
  constraint diagnoses_technician_fk foreign key (shop_id, technician_id)
    references public.shop_members(shop_id, id) on delete set null (technician_id)
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  work_order_id uuid not null,
  vehicle_id uuid not null,
  technician_id uuid,
  inspection_type text,
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint inspections_shop_id_id_key unique (shop_id, id),
  constraint inspections_work_order_fk foreign key (shop_id, work_order_id)
    references public.work_orders(shop_id, id) on delete restrict,
  constraint inspections_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict,
  constraint inspections_technician_fk foreign key (shop_id, technician_id)
    references public.shop_members(shop_id, id) on delete set null (technician_id)
);

create table public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  category text not null,
  item_name text not null,
  condition text not null default 'not_checked' check (condition in ('good', 'attention', 'urgent', 'not_checked')),
  measurement text,
  technician_note text,
  recommendation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.work_order_services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  work_order_id uuid not null,
  description text not null,
  service_category text,
  labor_hours numeric(8,2) check (labor_hours is null or labor_hours >= 0),
  labor_rate numeric(12,2) check (labor_rate is null or labor_rate >= 0),
  labor_amount numeric(12,2) check (labor_amount is null or labor_amount >= 0),
  status text not null default 'planned' check (status in ('planned', 'approved', 'in_progress', 'completed', 'declined')),
  technician_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_order_services_work_order_fk foreign key (shop_id, work_order_id)
    references public.work_orders(shop_id, id) on delete cascade,
  constraint work_order_services_technician_fk foreign key (shop_id, technician_id)
    references public.shop_members(shop_id, id) on delete set null (technician_id)
);

create table public.service_recommendations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid not null,
  vehicle_id uuid not null,
  work_order_id uuid,
  title text not null,
  description text,
  priority text check (priority is null or priority in ('low', 'medium', 'high', 'urgent')),
  recommended_date date,
  recommended_mileage integer check (recommended_mileage is null or recommended_mileage >= 0),
  estimated_cost numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  status text not null default 'recommended' check (status in ('recommended', 'scheduled', 'completed', 'declined', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_recommendations_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict,
  constraint service_recommendations_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict,
  constraint service_recommendations_work_order_fk foreign key (shop_id, work_order_id)
    references public.work_orders(shop_id, id) on delete set null (work_order_id)
);

create table public.customer_questions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  customer_id uuid not null,
  vehicle_id uuid,
  appointment_id uuid,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'open', 'answered', 'closed')),
  shop_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_questions_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict,
  constraint customer_questions_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete set null (vehicle_id),
  constraint customer_questions_appointment_fk foreign key (shop_id, appointment_id)
    references public.appointments(shop_id, id) on delete set null (appointment_id)
);

create table public.repair_reports (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  work_order_id uuid not null,
  customer_id uuid not null,
  vehicle_id uuid not null,
  report_number text not null,
  report_status text not null default 'draft' check (report_status in ('draft', 'final', 'void')),
  report_snapshot jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint repair_reports_shop_number_key unique (shop_id, report_number),
  constraint repair_reports_work_order_fk foreign key (shop_id, work_order_id)
    references public.work_orders(shop_id, id) on delete restrict,
  constraint repair_reports_customer_fk foreign key (shop_id, customer_id)
    references public.customers(shop_id, id) on delete restrict,
  constraint repair_reports_vehicle_fk foreign key (shop_id, vehicle_id)
    references public.vehicles(shop_id, id) on delete restrict
);

create unique index vehicles_shop_vin_key on public.vehicles (shop_id, vin) where vin is not null;
create index customers_shop_id_idx on public.customers (shop_id);
create index vehicles_shop_id_idx on public.vehicles (shop_id);
create index vehicles_customer_id_idx on public.vehicles (customer_id);
create index vehicles_vin_idx on public.vehicles (vin) where vin is not null;
create index appointments_shop_id_idx on public.appointments (shop_id);
create index appointments_customer_id_idx on public.appointments (customer_id);
create index appointments_vehicle_id_idx on public.appointments (vehicle_id);
create index appointments_scheduled_start_idx on public.appointments (scheduled_start);
create index appointments_status_idx on public.appointments (status);
create index work_orders_shop_id_idx on public.work_orders (shop_id);
create index work_orders_customer_id_idx on public.work_orders (customer_id);
create index work_orders_vehicle_id_idx on public.work_orders (vehicle_id);
create index work_orders_status_idx on public.work_orders (status);
create index diagnoses_shop_id_idx on public.diagnoses (shop_id);
create index diagnoses_work_order_id_idx on public.diagnoses (work_order_id);
create index diagnoses_vehicle_id_idx on public.diagnoses (vehicle_id);
create index inspections_shop_id_idx on public.inspections (shop_id);
create index inspections_work_order_id_idx on public.inspections (work_order_id);
create index inspection_items_inspection_id_idx on public.inspection_items (inspection_id);
create index work_order_services_shop_id_idx on public.work_order_services (shop_id);
create index work_order_services_work_order_id_idx on public.work_order_services (work_order_id);
create index service_recommendations_shop_id_idx on public.service_recommendations (shop_id);
create index service_recommendations_vehicle_id_idx on public.service_recommendations (vehicle_id);
create index service_recommendations_recommended_date_idx on public.service_recommendations (recommended_date);
create index service_recommendations_status_idx on public.service_recommendations (status);
create index customer_questions_shop_id_idx on public.customer_questions (shop_id);
create index customer_questions_status_idx on public.customer_questions (status);
create index repair_reports_shop_id_idx on public.repair_reports (shop_id);
create index repair_reports_work_order_id_idx on public.repair_reports (work_order_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shops_set_updated_at before update on public.shops for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger work_orders_set_updated_at before update on public.work_orders for each row execute function public.set_updated_at();
create trigger diagnoses_set_updated_at before update on public.diagnoses for each row execute function public.set_updated_at();
create trigger work_order_services_set_updated_at before update on public.work_order_services for each row execute function public.set_updated_at();
create trigger service_recommendations_set_updated_at before update on public.service_recommendations for each row execute function public.set_updated_at();
create trigger customer_questions_set_updated_at before update on public.customer_questions for each row execute function public.set_updated_at();

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.appointments enable row level security;
alter table public.work_orders enable row level security;
alter table public.diagnoses enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.work_order_services enable row level security;
alter table public.service_recommendations enable row level security;
alter table public.customer_questions enable row level security;
alter table public.repair_reports enable row level security;
