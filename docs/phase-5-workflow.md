# Phase 5: appointments and work orders

The customer → vehicle → appointment → check-in → work order → diagnosis handoff now uses persistent, shop-scoped records on the dedicated local MekaReports Supabase stack. No remote project, reset, environment/key change, push, or PR is required.

## Workflow

- Appointments have list, create, detail, and edit pages. Search covers customer name, vehicle, VIN, and concern; filters cover upcoming, today, all dates, and every appointment status. Lists paginate 25 records at a time.
- Customer is required; vehicle is initially optional. Vehicle choices narrow to the selected customer. Add Customer and Add Vehicle open another tab; Refresh choices retains the form's entries. Server validation errors retain dropdown selections as well as text/date inputs.
- Check In updates the status, retains the concern, gives success feedback, and offers Create Work Order. Linked appointments expose Open Work Order and defer service status to that job.
- Work orders have list, create, detail, and edit pages. Appointment context prefills the customer, vehicle, and complaint. A vehicle is required before saving a job; an appointment without one receives the chosen vehicle in the same transaction.
- Reopening Create Work Order for an appointment that already has a job redirects to that job. The database also serializes competing requests and enforces one work order per appointment.
- Work-order detail includes customer contact, vehicle/VIN/mileage, complaint, notes, technician, appointment, status actions, and the diagnosis handoff. Search covers number, customer, vehicle, VIN, and complaint; every status is filterable.
- Work orders start Draft or Open and progress Draft → Open → Diagnosing → Waiting Approval → Approved → In Progress → Completed. Nonterminal jobs may be cancelled after confirmation. Completed/cancelled jobs cannot reopen. The same transition rules apply in server actions and database triggers.
- A draft job checks in its appointment; an open/active job marks it In Service; completion/cancellation synchronizes the linked appointment. Appointment concern remains independent of subsequent work-order complaint edits.
- Customer detail offers Schedule Appointment; vehicle detail offers Schedule Appointment and Create Work Order. Prefills are verified on the server. Both detail pages show up to ten recent appointments/jobs with links to the full filtered lists.
- Dashboard remains publicly accessible. Signed-in shop members see today's appointments (excluding cancelled/no-show), distinct vehicles on active jobs, active work orders, and waiting-approval jobs. Active means open, diagnosing, waiting_approval, approved, or in_progress. Unsupported cards remain empty; query failures do not masquerade as zero records.
- Start AI Diagnosis passes workOrderId and vehicleId. The server verifies user, shop, work order, and matching vehicle before prefilling VIN, vehicle description, and complaint. The original diagnostic client and API behavior remain intact. Results are not saved yet.

## Scope and future work

- Owner, manager, and service advisor can create/read/update. Technicians are read-only for records in this phase, including technician notes. A future assigned-job mutation API should expose narrowly selected fields and enforce both role/assignment and allowed transitions in the database.
- Staff display names are not modeled yet. The minimal technician directory returns same-shop technician membership IDs and `Technician <short membership ID>` labels, without exposing Auth emails or widening membership-table access.
- Inspection is a disabled Phase 6 action. Services/labor is a clearly labeled Phase 6/7 section. No work_order_services or diagnosis policies were opened.
- Scheduling explicitly uses America/New_York, including daylight saving time, independently of browser/server timezone. Nonexistent spring-forward times are rejected; repeated fall-back times choose the earlier occurrence. A configurable shop timezone is future work.
- AI text/VIN execution was tested live. Image-upload variants were not retested; their implementation is unchanged. Diagnosis persistence remains Phase 6.

## Migrations and authorization

New migrations, applied locally with migration up and without reset:

1. `20260921002740_appointments_work_orders.sql`: appointment/work-order RLS and column grants, composite relationship constraints, schedule/status indexes, one-job-per-appointment uniqueness, controlled-transition triggers, private counter, atomic appointment synchronization, and the minimal scoped technician directory.
2. `20260921003332_job_read_models.sql`: a trigger-replaced number default for accurate generated Insert types, plus SELECT-only SECURITY INVOKER listing views that retain underlying table RLS.

Server actions derive shop ID from verified shop context and validate input with Zod. Customer, vehicle, appointment, and technician IDs are checked against the active shop and one another. Database constraints/triggers independently enforce those relationships. Browser-provided shop IDs and editable user_metadata never authorize access. Identity, tenancy, number, and job-context columns cannot be changed through client UPDATE grants. DELETE is not granted; cancellation preserves history.

Numbers use `WO-YYYY-000001`, generated in a private BEFORE INSERT trigger. An atomic per-shop counter upsert takes a row lock; the counter continues across years, with the UTC creation year in the display prefix. Existing numbers cannot be overwritten by clients. A failed transaction rolls back its allocation. The private definer functions have empty search paths and qualified references; the write trigger verifies authoritative membership before allocation/synchronization. Appointment row locking plus a unique index prevents concurrent duplicates.

## Verification

```powershell
npx.cmd supabase migration up --local
npx.cmd supabase test db --local
npx.cmd supabase db advisors --local --type security --level warn --fail-on error
node scripts/test-job-concurrency.mjs
node --experimental-strip-types scripts/test-job-time.mjs
npm.cmd run lint
npm.cmd run build
git diff --check
```

- 131 pgTAP assertions passed: the 59 Phase 4 regressions plus 72 Phase 5 assertions. Fixtures run in transactions and roll back.
- Tests cover own-shop access, cross-shop reads/writes, same-shop wrong-customer vehicles, appointment/job relationship mismatches, immutable fields, allowed/invalid transitions, technician restrictions, manager/advisor writes, metadata escalation, anonymous denial, invoker-view isolation, and technician deletion preserving job history.
- Concurrency test passed: eight simultaneous walk-in jobs received distinct professional numbers; two simultaneous requests for one appointment produced exactly one job and atomic appointment status synchronization. The script is fixed to the dedicated local Docker container and cleans up only its random fixture IDs.
- Time tests passed for winter/summer conversion, invalid dates, the spring DST gap, repeated fall time, and 23/25-hour today boundaries.
- Local security advisors reported no warning/error issues.
- Browser: temporary sign-up/onboarding, customer creation, VIN decode/vehicle creation, prefills, appointment creation/reload/edit/check-in, optional vehicle, cancellation confirmation, linked work-order creation/reload/edit, date/mileage validation, retained inputs, and duplicate-route redirection passed.
- Browser: full work-order status sequence, linked appointment completion, customer/vehicle history, appointment today/status/concern filtering and empty state, work-order VIN/status filtering, and real dashboard totals passed.
- Browser: technician read-only detail/edit redirection and rejection of a mismatched diagnosis vehicle passed. Live AI Diagnosis returned a diagnostic result with VIN lookup and the original result sections.
- Desktop and 390px mobile appointment list/form layouts were checked; wide tables scroll inside their cards.
- Appointment details and edited work-order notes/mileage/status persisted after a production-server restart and in a fresh browser tab.
- Signed-out appointment/work-order detail pages redirected to login. The public dashboard, standalone diagnosis, inspections, reports, service reminders, questions, and settings remained accessible.
- Normal lint, production build, and diff whitespace checks passed. Browser fixture records and the temporary Auth account were removed by exact IDs; the pre-existing Auth account was retained and database counts matched the pre-test baseline.

## Files created

- `app/appointments/[id]/edit/page.tsx`
- `app/appointments/[id]/page.tsx`
- `app/appointments/error.tsx`
- `app/appointments/new/page.tsx`
- `app/diagnosis/diagnosis-workspace.tsx` (existing diagnostic client moved here)
- `app/work-orders/[id]/edit/page.tsx`
- `app/work-orders/[id]/page.tsx`
- `app/work-orders/error.tsx`
- `app/work-orders/new/page.tsx`
- `components/jobs/dashboard-snapshot.tsx`
- `components/jobs/job-editor.tsx`
- `components/jobs/job-form.tsx`
- `components/jobs/job-list.tsx`
- `components/jobs/job-ui.tsx`
- `components/jobs/status-actions.tsx`
- `docs/phase-5-workflow.md`
- `lib/jobs/actions.ts`
- `lib/jobs/data.ts`
- `lib/jobs/status.ts`
- `lib/jobs/time.ts`
- `lib/jobs/validation.ts`
- `scripts/test-job-concurrency.mjs`
- `scripts/test-job-time.mjs`
- `supabase/migrations/20260921002740_appointments_work_orders.sql`
- `supabase/migrations/20260921003332_job_read_models.sql`
- `supabase/tests/jobs.test.sql`

## Files modified

- `app/appointments/page.tsx`
- `app/customers/[id]/page.tsx`
- `app/diagnosis/page.tsx`
- `app/page.tsx`
- `app/vehicles/[id]/page.tsx`
- `app/work-orders/page.tsx`
- `docs/supabase-auth-architecture.md`
- `proxy.ts`
- `types/database.ts`
