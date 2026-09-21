# Phase 4: local shop, customer, and vehicle workflow

This workflow uses the dedicated local MekaReports Supabase API at `http://127.0.0.1:54331` (database port `54332`). The existing `supabase/config.toml` local environment changes are preserved, not committed with application work. Environment files and keys are unchanged. No remote linking, reset, PR, or push is part of this phase.

## Workflow

- Successful sign-in still opens the public dashboard. New Customer and Add Vehicle now open `/customers/new` and `/vehicles/new`.
- Customer and vehicle pages verify the user and shop on the server. Signed-out users go to `/login`; users without a membership go to `/onboarding`.
- Onboarding collects the shop's name and optional contact/address fields. The RPC atomically creates the shop and owner membership. Existing members go to Customers; duplicate requests cannot create another initial shop.
- Customers: searchable paginated list, create, detail, edit, linked vehicle counts, and paginated linked vehicles. Search covers first name, last name, phone, and email.
- Vehicles: searchable paginated list, create, detail, edit, and a link to the customer. Search covers VIN, make, model, and plate. Customer search remains available in Customers.
- Add Vehicle from a customer preselects that customer. Server actions recheck that the chosen customer belongs to the active shop. Composite database constraints independently enforce the relationship.
- Required fields, length limits, VIN syntax, integer mileage/year, and customer IDs are checked with Zod on the server. Forms retain input after validation errors and show inline errors, pending states, cancel links, and successful navigation.
- Technicians can read records; owner, manager, and service advisor can create and edit. Deletion is deliberately unavailable to preserve future service history. No synthetic history or business records are shipped.
- Service History remains an honest empty state. Appointments, work orders, and other legacy modules remain unchanged and accessible during development.

## Database security

Migration: `supabase/migrations/20260920234651_shop_onboarding_customer_vehicle_rls.sql`.

- Membership SELECT permits only `user_id = (select auth.uid())`.
- Shop SELECT requires membership.
- Customer/vehicle SELECT permits all members of that shop; INSERT and UPDATE require owner, manager, or service advisor.
- UPDATE policies check both existing and resulting rows; column grants exclude `shop_id` and record IDs. Client membership writes are not granted.
- Anonymous business-table grants are revoked. DELETE is not granted for these workflows.
- No `using (true)`, editable metadata authorization, recursive policies, service-role keys, or broad authorization helper functions.
- The only new definer function is the authenticated first-shop RPC. It locks the caller's Auth row before checking membership, has `search_path = ''`, and does not accept user or shop IDs.
- Deleting an Auth user removes membership but preserves the shop and its records.
- Generated `types/database.ts` comes from the local public schema; the typed server client is mapped into the existing Customer/Vehicle domain types.

## VIN architecture

`lib/vin.ts` contains the extracted NHTSA decoder. AI Diagnosis imports the same decoder with its original behavior, response shape, and engine fallback. Its OpenAI request and response handling are unchanged.

`POST /api/vehicles/decode-vin` verifies shop context and write role, validates the VIN, and calls the decoder with a 10-second timeout. It uses NHTSA only; no OpenAI request or key is involved. Lookup failure gives a manual-entry message and does not require a successful decode before saving. Available decoded fields remain editable.

## Repeatable local database verification

Run from the project root in PowerShell:

```powershell
npx.cmd supabase migration up --local
npx.cmd supabase test db --local
npx.cmd supabase db advisors --local --type security --level warn --fail-on error
npm.cmd run lint
npm.cmd run build
git diff --check
```

The pgTAP suite in `supabase/tests/shop_workflow.test.sql` creates randomly identified fixtures within a transaction and rolls everything back. It covers bootstrap, duplicate prevention, own-shop access, cross-shop reads/writes, composite relationships, immutable shop IDs, owner/manager/advisor writes, technician restrictions, metadata escalation, anonymous denial, and shop preservation on Auth-user deletion. It never disables RLS or requires a reset.

## Browser verification checklist

Use a temporary local verification account and remove its isolated records afterward; never populate a real shop with sample customers.

1. Open Customers while signed out: expect login. Create/sign in to an account with no membership: open New Customer and expect onboarding.
2. Create a shop and confirm its customer list is empty. Reopen onboarding: expect Customers.
3. Create a customer. Check whitespace-only names trigger inline validation and preserve entered fields. Reload the detail page and verify contact information.
4. Use Add Vehicle from that customer; verify the preselected customer. Decode a sample VIN, review/edit decoded fields, save, and reload.
5. Follow the customer link and verify the same vehicle remains listed after reload. Edit customer and vehicle fields and verify saved values.
6. Search customer phone/email/name and vehicle VIN/make/model/plate. Verify no-match states.
7. Try an undecodable VIN: verify a clear manual-entry message and editable fields. Try a duplicate VIN: verify the inline error preserves the selected customer, then correct the VIN and save. Saving without VIN, year, or mileage is supported. The form prevents React's automatic reset so the customer selection survives returned validation errors.
8. Inspect list and form at desktop and 390px mobile widths; tables scroll inside their cards.
9. Run AI Diagnosis with a test scenario and VIN; verify the result and VIN section. Recheck legacy pages remain accessible.
10. Restart the local Next server or reopen the record URLs in a new browser tab and verify persistence.

## Verified in this implementation

- 59 pgTAP assertions passed; local security advisors reported no issues at warning/error level.
- Normal `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` passed. The build used the local Supabase URL above.
- Browser: onboarding, customer create/edit/search, vehicle create/edit/plate search, VIN success/failure, duplicate VIN correction, manual entry with optional fields blank, and preserved customer selection after errors passed.
- Customer, vehicle, updated mileage, and relationship persisted after reload and after a Next server restart in a fresh browser tab.
- Live AI Diagnosis returned a full diagnostic result and the decoded sample VIN. Its image-upload flows were not exercised in this phase; their code is unchanged.
- Desktop and 390px mobile list/form views checked. All requested legacy pages returned HTTP 200. Signed-out real-data pages redirected to login and the VIN endpoint returned 401.
- Temporary browser-test account, shop, customer, and vehicles were removed after verification. The pre-existing Auth account was preserved. SQL fixtures were rolled back.

## Files created

- `app/api/vehicles/decode-vin/route.ts`
- `app/customers/[id]/edit/page.tsx`
- `app/customers/[id]/page.tsx`
- `app/customers/error.tsx`
- `app/customers/new/page.tsx`
- `app/onboarding/error.tsx`
- `app/onboarding/page.tsx`
- `app/vehicles/[id]/edit/page.tsx`
- `app/vehicles/[id]/page.tsx`
- `app/vehicles/error.tsx`
- `app/vehicles/new/page.tsx`
- `components/workshop/record-form.tsx`
- `components/workshop/record-ui.tsx`
- `components/workshop/records-error.tsx`
- `docs/phase-4-workflow.md`
- `lib/vin.ts`
- `lib/workshop/actions.ts`
- `lib/workshop/data.ts`
- `lib/workshop/permissions.ts`
- `lib/workshop/validation.ts`
- `proxy.ts`
- `supabase/migrations/20260920234651_shop_onboarding_customer_vehicle_rls.sql`
- `supabase/tests/shop_workflow.test.sql`
- `types/database.ts`

## Files modified

- `app/api/diagnose/route.ts`
- `app/customers/page.tsx`
- `app/login/login-form.tsx`
- `app/page.tsx`
- `app/vehicles/page.tsx`
- `docs/supabase-auth-architecture.md`
- `lib/auth/session.ts`
- `lib/auth/types.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/server.ts`
