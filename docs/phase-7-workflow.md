# Phase 7: estimate authorization and repair completion

Implemented locally on `mekareports-foundation`. The existing `work_order_services` and `service_recommendations` models are extended rather than replaced. No remote Supabase project, reset, environment/key change, SMS/email integration, inventory system, or production deployment is involved.

## Workflow and data model

- A saved diagnosis or an Attention/Urgent inspection item can prefill a recommendation. This includes pre-inspection findings. A mechanic must review and save it; AI suggestions never automatically become repairs. Manual recommendations are also supported. Source references use composite same-shop/work-order foreign keys. Request keys make retries idempotent.
- `Add to Estimate` connects one service to its source recommendation. Manual services have customer-facing explanations, category, decimal labor hours/rate, fees, technician, order, status, start/completion timestamps, and completion notes. Repeated conversion returns the existing service.
- `work_order_parts` stores structured parts, SKU/description, positive quantity, optional internal cost, customer price, generated amount, and planned/approved/installed/declined status. UI parts are attached to services; the schema allows an optional service reference for future use. Internal acquisition cost is excluded from ordinary authenticated column grants and every public projection.
- PostgreSQL `numeric` calculations are authoritative. Triggers calculate labor, parts, and service totals; estimate snapshots aggregate these amounts. Clients cannot write totals or repair statuses directly. The selected-repair browser total uses integer cents. Prices are USD and explicitly **pre-tax**; tax is zero and no jurisdiction's rules are inferred.
- `work_order_estimates` stores number, version, current flag, status, notes, aggregate amounts, frozen customer/vehicle/shop context, author, and lifecycle timestamps. `work_order_estimate_items` freezes customer explanations, labor/prices, customer-safe parts, and each decision/time.
- A locked per-shop counter creates `EST-YYYY-000001` numbers without `count + 1`. A job retains its estimate number across increasing versions. The counter does not reset each year. A unique current-version index and work-order locks prevent concurrent duplicates.
- Draft pricing can change. Presentation freezes the snapshot and moves the job to `waiting_approval`, including existing Phase 5 jobs already waiting or approved. Revisions invalidate old pending links and require fresh choices for every line. Historical approved/declined decisions and audits remain intact. Revisions are permitted only before any service starts.
- The customer approves or declines each repair independently. Submission requires every line to be resolved; incomplete submissions leave the estimate presented without partial writes. All approved produces `approved`; mixed decisions produces `partially_approved`; all declined produces `declined` and returns the work order to `open`, without cancelling it.
- Resolved authorization with at least one approval moves the job to `approved`. Staff can start each approved service; the first start moves the job to `in_progress`. Declined services have no start action and the database rejects attempts to start them.
- Completing a started repair requires a technician completion note and records the completing member/time. Its approved parts become installed and its source recommendation becomes completed.
- Completing the work order requires resolved decisions, every service completed or declined, at least one completed service, and valid mileage out at least mileage in. The database records completion, advances vehicle mileage only if higher, and completes the linked appointment through the existing appointment synchronization trigger.
- Completed repair/job history cannot be casually edited or restarted. Staff-reference deletion clears only nullable references while preserving estimate snapshots and history. A manager correction workflow is reserved for a later phase.
- Unperformed recommendations can retain a date/mileage target with `recommended` status, including after job completion. Completed/approved work cannot be deferred as an unperformed recommendation. No reminders are sent.

## Customer authorization and security

`/approve/[token]` is a separate customer page with no mechanic navigation or login requirement. It displays frozen shop contact, customer name, vehicle/VIN/mileage, work-order reference, estimate version, line pricing, full and selected pre-tax totals, and customer choices. It never renders database IDs, internal notes/costs, or unrelated records.

PostgreSQL generates a 256-bit random token, stores only its SHA-256 hash, and returns the raw token once to the authorized shop action. Links expire after seven days. Generating a replacement invalidates unanswered older links. Superseded estimates cannot be authorized. Responded links show a receipt until expiry, but cannot submit another response. Copy the link when shown; a page reload requires generating a replacement if it was not copied.

The public server client is cookie-free and uses the publishable key. Narrow anonymous RPCs validate the token and return an explicit customer-safe projection. They do not grant anonymous table access. The public POST endpoint bounds JSON bodies, validates each choice/name/acknowledgment, and delegates the atomic transaction to the database. Work-order/request locks serialize response, revision, and replay races. Line ordinals resolve exclusively within the token's estimate; posted IDs cannot select another record.

`customer_approval_audits` stores customer-entered name/note, acknowledgment, exact item decisions and IDs, response method, time, and staff member where applicable. Authenticated clients cannot alter audit records. Phone and in-person authorization use a separate manager-authorized RPC and explicitly record their method; they invalidate pending portal links. SMS/email method values are reserved for future delivery. The UI says “Customer authorization recorded” and does not claim legally certified signatures.

All new public tables have shop-membership SELECT RLS. Mutations use explicit membership-checked, empty-search-path RPCs; clients have no direct mutation grants. Owners, managers, and service advisors manage estimates. Technicians can read repair data, record recommendations, start/complete approved work, and finalize valid jobs, but cannot price/present/revise estimates or record staff authorization. Editable `user_metadata` is never used for authorization. A private, ungranted transaction-context table allows vetted status transitions without impersonating a staff JWT. Existing RLS remains enabled.

Public routes are dynamic and carry no-store, no-referrer, noindex/nofollow, and frame-denial headers. The raw approval link is a bearer capability: anyone receiving it can review and authorize that estimate. Production delivery, transport configuration, communication history, and abuse/rate controls remain deployment/Phase 8 work.

## Shop UI and history

Work Order Detail now shows recommendations, services/parts, estimate status/version/totals, authorization, timestamps, and completion notes. Its estimate workspace provides draft editing, presentation/copy link, separate staff authorization, revision, individual repair start/completion, future recommendations, and job completion. Invalid pricing/completion actions are hidden and independently rejected by PostgreSQL.

Dashboard counts use actual shop data for waiting approval, completed today, and unperformed recommendations with a future date or mileage target. Existing daily counts retain the app's New York time convention. Customer and vehicle details show completed repairs, recommendations, estimate versions/decisions, source work orders, and mileage progression across the newest 50 work orders, with older records available through Work Orders.

The approval page was visually checked at 390 × 844 and supports large independent approve/decline controls. History and structured snapshots are ready for Phase 8 receipts/reports and link delivery. This phase does not implement final invoices, automatic tax rules, inventory, post-start estimate changes, destructive corrections, or delivery/reminders. A fully declined estimate leaves an open job for follow-up.

## Migrations

1. `20260921212626_estimate_approval_repair_workflow.sql`: additive tables/columns, constraints, calculations, authorization, RLS, snapshots, and controlled status transitions.
2. `20260921220954_repair_history_compatibility.sql`: allow first presentation on existing approved/waiting jobs and preserve frozen estimate history when its staff author is removed.

Both were preflighted in rollback transactions and applied with `npx.cmd supabase migration up --local`. No old migration was edited and no reset was run. Generated database types are updated.

## Verification

- `npx.cmd supabase test db --local`: **300 assertions passed**, including 81 Phase 7 assertions and all 219 existing shop/job/clinical assertions. Coverage includes role/shop isolation, anonymous denial, immutable history, negative/zero quantities, exact totals, invalid/expired/superseded tokens, replay, atomic decisions, completion guards, mileage/appointments, legacy-state compatibility, and account-removal history retention.
- `npx.cmd supabase db advisors --local --type security --level warn --fail-on error`: **no issues found**.
- `node --env-file=.env.local scripts/test-repair-workflow.mjs`: passed real local Auth/PostgREST/HTTP tests with isolated shops. Tests include simultaneous draft/part retries, six concurrent estimate numbers, simultaneous customer submissions (one succeeds, one fails replay), public HTML/API without cookies, private-field exclusion, cross-shop services/parts/estimates/existing audits, partial/all approval, all-declined phone response, in-person response, version/audit retention, repairs, installed parts, future recommendations, and mileage/appointment synchronization.
- Monetary fixture: `1.50 × $120.00 = $180.00` labor; `2 × $45.55 = $91.10` parts; `$5.00` fees; service `$276.10`; optional repair `$60.00`; full estimate `$336.10`. Only the `$276.10` repair was approved. Fractional `0.10 × $0.20 = $0.02` was also checked.
- Browser: inspection finding → confirmed recommendation → service → parts/manual service → draft → presentation/revision → unauthenticated mobile customer approval/decline → audit → start → technician completion → installed parts → completed job. The customer used a separate loopback origin whose login page confirmed no mechanic session. Invalid links showed the dedicated unavailable page without navigation.
- Refresh and production-server restart retained completed status, technician note, installed parts, authorization/decisions, version history, future date/mileage, and the customer receipt. Vehicle and customer history showed the repair and both versions; vehicle mileage was 125,010 and the appointment completed. Dashboard showed one completed job and one upcoming recommendation for the isolated shop.
- AI/VIN regression: a real diagnostic request for the temporary vehicle returned a structured result and decoded VIN, then saved successfully to the job. Its Add Recommendation action prefilled the saved summary and required confirmation.
- Inspection/pre-inspection regression: existing database assertions for checklist creation, readiness/scoring, completion/immutability, and isolation all passed; the browser displayed the existing multi-point checklist and source finding correctly. `node --env-file=.env.local scripts/test-inspection-storage.mjs` passed real private upload/download, signed access, decoded image formats, forged/oversized image rejection, and anonymous/cross-shop isolation.
- All temporary accounts, shops, operational records, and Storage test objects were removed by exact fixture IDs. Original full-row counts/fingerprints matched across Auth, shops/members, customers, vehicles, appointments, work orders, diagnoses, inspections/items/photos, and Storage metadata. The original one Auth account, shop, customer, vehicle, work order, inspection, 18 inspection items, and private photo remain unchanged. No original appointments or diagnoses existed at the start of Phase 7.
- Normal `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` passed. The temporary production server was stopped and verification tabs closed.

To repeat the integration suite, start the production app on port 3100 with the local MekaReports Supabase API on 54331. The script refuses other database targets and cleans its own fixtures. Optional `--create-browser-fixture` / `--cleanup-browser-fixture` modes support interactive verification; credentials are written only to ignored `supabase/.temp/phase7-browser.json` and removed on cleanup.

## Files created

- `app/api/approvals/[token]/route.ts`
- `app/approve/[token]/page.tsx`
- `app/approve/[token]/not-found.tsx`
- `app/approve/error.tsx`
- `app/estimates/[id]/page.tsx`
- `app/estimates/error.tsx`
- `app/recommendations/new/page.tsx`
- `app/recommendations/error.tsx`
- `app/work-orders/[id]/estimate/page.tsx`
- `components/repairs/approval.tsx`
- `components/repairs/form.tsx`
- `components/repairs/history.tsx`
- `components/repairs/workspace.tsx`
- `lib/repairs/actions.ts`
- `lib/repairs/data.ts`
- `lib/repairs/public.ts`
- `lib/repairs/validation.ts`
- `scripts/test-repair-workflow.mjs`
- `supabase/migrations/20260921212626_estimate_approval_repair_workflow.sql`
- `supabase/migrations/20260921220954_repair_history_compatibility.sql`
- `supabase/tests/repairs.test.sql`
- `docs/phase-7-workflow.md`

## Files modified

- `app/customers/[id]/page.tsx`
- `app/diagnoses/[id]/page.tsx`
- `app/inspections/[id]/page.tsx`
- `app/page.tsx`
- `app/vehicles/[id]/page.tsx`
- `app/work-orders/[id]/page.tsx`
- `components/app-shell.tsx`
- `components/jobs/dashboard-snapshot.tsx`
- `components/jobs/job-editor.tsx`
- `docs/supabase-auth-architecture.md`
- `next.config.ts`
- `proxy.ts`
- `types/database.ts`
