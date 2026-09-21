# Phase 6: saved diagnosis and inspections

The work-order workflow now persists deliberately saved AI diagnoses, multi-point inspections, generic pre-inspection readiness, and private inspection photos on the dedicated local MekaReports Supabase stack. Existing migrations, environment files, Auth accounts, and operational records are preserved. No database reset or remote Supabase connection is required.

## Diagnosis and job history

- The existing AI workspace/API remains intact. Launching from a work order still verifies and prefills its vehicle and complaint. After a successful response, **Save Diagnosis to Work Order** stores the captured symptoms/codes, summary, severity, full normalized response, and recording staff membership. There is no automatic save.
- The server derives the active shop and work-order vehicle. Composite foreign keys validate job/vehicle/shop and same-shop technician relationships. A unique per-shop save key makes retries idempotent.
- Saved diagnosis detail displays the result and exposes separate technician findings/confirmed-cause fields. Job, customer, and vehicle pages show the 50 newest saved diagnoses and inspections with links. Job status remains unchanged when saving a diagnosis or completing an inspection.

## Inspection workflow

- `/inspections` provides search plus type, status, and recent-date filters, with 25-row pagination. `/inspections/new` prefills the verified job, vehicle context, and assigned technician or current staff member.
- The creation RPC copies versioned definitions into persistent items in one transaction. All items start `not_checked`. A per-shop request key plus a work-order lock prevents concurrent accidental duplicates; starting another inspection intentionally creates a new snapshot.
- Multi-point version 1.0 contains 22 items in 14 categories: tires; brakes; steering/suspension; lights; battery/charging; engine/fluids; leaks; belts/hoses; wipers/washer; glass; HVAC; exhaust; safety equipment; road-test/general observations.
- The grouped editor provides touch-friendly condition controls, measurements, notes, recommendations, checked counts, and explicit Save Progress feedback. Save uses optimistic concurrency: stale updates fail instead of overwriting another person's findings.
- Complete Inspection requires a second deliberate action and acknowledgment of required unchecked items. Unchecked items remain unchecked. Completion records `completed_at` and prevents further findings edits. An intentional new inspection remains available. Photos may be appended to the record; saved findings remain immutable.
- Inspection detail is a customer-readable report with shop/contact, customer, vehicle, VIN, mileage, date, findings, recommendations, photos, and a browser print action. Print styles remove navigation and editing controls. The final PDF/invoice engine is outside this phase.

## Generic readiness and deterministic scoring

The generic version 1.0 checklist has 18 weighted safety/emissions items, including MIL, OBD monitors, tires, brakes, lights, horn, visibility, steering/suspension, exhaust/leaks, restraints, and emissions observations. State/territory selection records context; no verified state-specific packs exist yet. The UI explicitly labels **Generic Readiness** and states that final decisions belong to the authorized inspection authority/station. It makes no official certification or state-compliance claim.

Definitions, weights, required/critical flags, template key, and criteria version are copied/stored with each inspection. Historical findings never rely on a mutable live template. Future verified packs can introduce new versioned definitions without changing existing snapshots.

The database calculates the rounded weighted percentage on item changes: good earns full weight, attention half weight, urgent and not-checked zero. Result precedence is:

1. Any required unchecked item: `incomplete`.
2. Any urgent critical item: `high_risk`, regardless of score.
3. Otherwise 85 or higher: `likely_ready`; 65–84: `needs_attention`; below 65: `high_risk`.

The saved score, result, blocker list, item counts, and recommendations appear on detail/history/list screens as appropriate. Browser-supplied scores, weights, criteria, context changes, and completion timestamps are not writable. No AI is involved in scoring.

## Private photos and authorization

- `inspection_photos` metadata has shop/inspection/item composite relationships. Object paths are `<shop>/<inspection>/<photo>.jpg` in private `inspection-photos` Storage.
- The authenticated application endpoint accepts JPEG/PNG/WebP up to 5 MB and 40 megapixels. It bounds the request stream, decodes actual image bytes, rejects unsupported/animated/forged input, applies orientation, strips metadata, scales to at most 2400 pixels, and re-encodes JPEG. Bucket limits independently restrict size and MIME type.
- Uploads use the verified user's Supabase client, with no service-role key. Metadata and object policies enforce parent-shop membership. Display uses signed URLs valid for 15 minutes; page refresh renews them. URLs are temporary bearer links and should be shared only intentionally.
- Owner, manager, service advisor, and technician may read/create/update clinical work within their shops. Existing technician restrictions on job/customer/vehicle administration remain unchanged. Anonymous/cross-shop access is denied. Authorization never uses editable user metadata.
- RPC helpers have empty search paths, qualified references, explicit grants, and membership checks. Listing views use SECURITY INVOKER. Cleanup deletion is limited to a caller's own unregistered objects after a failed metadata save; no destructive clinical UI is exposed.

## Migrations

New migrations were applied with `npx.cmd supabase migration up --local`, without reset:

- `20260921125946_diagnosis_inspection_workflow.sql`: context constraints, clinical RLS/grants, versioned templates, controlled creation/save RPCs, deterministic scoring, completed snapshot protection, private photo metadata/bucket/object policies, inspection listing view.
- `20260921131352_diagnosis_history_read_model.sql`: diagnosis listing view with RLS-preserving work-order/customer context.

`types/database.ts` was regenerated from the local schema. Historical migration files were not edited.

## Verification

```powershell
npx.cmd supabase test db --local
npx.cmd supabase db advisors --local --type security --level warn --fail-on error
node --env-file=.env.local --experimental-strip-types scripts/test-inspection-storage.mjs
npm.cmd run lint
npm.cmd run build
git diff --check
```

- 219 database assertions passed: all 131 existing Phase 4/5 regressions and 88 new clinical assertions. Transactional fixtures roll back. Coverage includes every role, tenant/parent isolation, anonymous denial, relationship mismatches, idempotent creation, definition/score forgery denial, scoring thresholds/critical overrides/incomplete precedence, stale writes, completion acknowledgment, immutable completed findings, and photo metadata/object isolation.
- The repeatable Storage API test passed: concurrent create retries produce one inspection, valid upload/download and signed access work, cross-shop/anonymous/private-public-URL access fails, and format/size limits reject invalid input. Its randomly identified fixtures and objects are cleaned up.
- The application photo endpoint accepted a neutral PNG, stored a JPEG privately, rejected forged bytes and anonymous upload. The signed image rendered in the browser and remained after a production-server restart. The browser extension's file chooser could not select a local file because file-URL access was disabled; upload was therefore exercised through the authenticated HTTP endpoint rather than the native chooser.
- Browser verification used an isolated temporary account/shop: onboarding, customer, VIN decoder, vehicle, work order, real AI response, deliberate diagnosis save, reload, job display, and separate technician findings save passed.
- The 22-item multi-point checklist started entirely unchecked; three condition changes plus measurement/note/recommendation saved. Findings and the private image survived a production-server restart. Completion required acknowledgment of 19 unchecked items and preserved them without completing the work order.
- Readiness browser checks produced 100% Likely Ready, then 93% High Risk with one urgent critical MIL item, then 90% Incomplete when a required horn item was unchecked. Restoring that check and completing as a technician retained the 93% critical-risk result and blocker.
- Customer and vehicle histories showed the saved diagnosis and both inspections. Desktop and 390px inspection editor layouts were checked; phone controls fit without horizontal overflow.
- Inspection type/completion/today/VIN filters returned the expected single record, and a draft filter showed the empty state. A fresh browser tab after another production-server restart retained the completed 93% readiness result, critical blocker, version, and recommendations.
- The print action invokes the browser's native dialog; that dialog could not be visually captured by the browser automation surface. The customer-readable detail and print CSS were reviewed; a physical print/PDF export was not produced.
- All temporary browser records and the photo object were removed by exact fixture IDs, with Storage API cleanup for the physical image. The original Auth identity was checked before/after cleanup and preserved. Final counts matched the initial baseline: one Auth user and zero shops, customers, vehicles, appointments, work orders, diagnoses, inspections, and photo metadata rows. No user-created business records existed at the start of this run.
- Security advisors reported no issues. Normal lint, production build, and whitespace checks passed.
- Signed-out smoke checks returned 200 for the dashboard, login, standalone diagnosis, reports, service reminders, questions, and settings. Onboarding, customer/vehicle/job pages, inspections, and saved diagnosis detail redirected to login as intended. The temporary production server was stopped after verification.

## Files created

- `app/api/inspections/[id]/photos/route.ts`
- `app/diagnoses/[id]/page.tsx`
- `app/diagnoses/error.tsx`
- `app/inspections/[id]/edit/page.tsx`
- `app/inspections/[id]/page.tsx`
- `app/inspections/error.tsx`
- `app/inspections/new/page.tsx`
- `components/diagnoses/notes.tsx`
- `components/inspections/editor.tsx`
- `components/inspections/new-form.tsx`
- `components/inspections/photos.tsx`
- `components/inspections/readiness.tsx`
- `components/jobs/clinical-history.tsx`
- `docs/phase-6-workflow.md`
- `lib/diagnoses/actions.ts`
- `lib/diagnoses/validation.ts`
- `lib/inspections/actions.ts`
- `lib/inspections/data.ts`
- `lib/inspections/images.ts`
- `lib/inspections/validation.ts`
- `scripts/test-inspection-storage.mjs`
- `supabase/migrations/20260921125946_diagnosis_inspection_workflow.sql`
- `supabase/migrations/20260921131352_diagnosis_history_read_model.sql`
- `supabase/tests/clinical_workflow.test.sql`

## Files modified

- `app/customers/[id]/page.tsx`
- `app/diagnosis/diagnosis-workspace.tsx`
- `app/globals.css`
- `app/inspections/page.tsx`
- `app/vehicles/[id]/page.tsx`
- `app/work-orders/[id]/page.tsx`
- `components/app-shell.tsx`
- `docs/supabase-auth-architecture.md`
- `package.json` / `package-lock.json` (explicit pinned Sharp dependency, already present through Next.js)
- `proxy.ts`
- `types/database.ts`
