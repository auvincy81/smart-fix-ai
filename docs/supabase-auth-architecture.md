# Supabase authentication architecture

Phases 4 through 6 use the dedicated local MekaReports Supabase stack. No remote project is linked or changed.

## Identity and shop authorization

- `auth.users.id` identifies an authenticated person.
- `public.shop_members` links that person to one or more shops and is the authoritative source for `owner`, `manager`, `service_advisor`, and `technician` roles.
- Editable `user_metadata` must never authorize shop access.
- Deleting an Auth user cascades only to their membership rows. Shops remain, and nullable operational references to memberships retain history.

RLS policies cover shops, own memberships, customers, vehicles, appointments, work orders, diagnoses, inspections, inspection items, and inspection photo metadata/objects. Every business operation is scoped by `(select auth.uid())`, authoritative membership, and the record's shop or parent inspection. Other business tables remain closed pending their workflow phases. See [Phase 4 implementation and verification](phase-4-workflow.md), [Phase 5 jobs](phase-5-workflow.md), and [Phase 6 diagnosis and inspections](phase-6-workflow.md).

## SSR session lifecycle

The browser and server client factories return `null` while public Supabase configuration is absent. Server identity checks use `auth.getUser()` rather than trusting the user embedded in `getSession()`.

The root `proxy.ts` activates `lib/supabase/proxy.ts` for the dashboard, login, onboarding, customers, vehicles, appointments, work orders, diagnosis, saved diagnoses, inspections, and the vehicle VIN/photo endpoints. It refreshes cookies using `getClaims()`; pages and server actions still verify the current user with `getUser()`. The dashboard and standalone diagnosis remain open. Diagnosis launched with a work-order ID requires verified shop access and a matching vehicle. Shop-context results are cached only within a React server request, never globally across users.

## Shop context and onboarding

`requireShopContext()` redirects signed-out users to `/login` and users without membership to `/onboarding`. Database errors produce a recoverable error view rather than treating a failed lookup as an absent membership. If multiple memberships exist, the earliest membership (then ID as a stable tie-breaker) is used until a shop selector is introduced.

The `create_initial_shop` RPC uses only `auth.uid()`, locks the Auth user row, rejects existing membership, and creates the shop plus owner membership in one transaction. `SECURITY DEFINER` is required because clients have no shop or membership INSERT permission. The function has an empty search path, fully qualified table references, and authenticated-only execution. No authorization helper or recursive membership policy is required.

Server actions validate fields with Zod and derive the shop ID from context. RLS remains the final authority for direct API requests. Column-level UPDATE grants also prevent changing a customer's or vehicle's shop ID, including users with access to more than one shop.

MekaReports is not connected to Mapou Academy or VannPro.

## Clinical workflows and private images

All four shop roles may record diagnoses and perform inspections. Phase 5 technician restrictions on customer/vehicle/job administration remain in force. Inspection creation and completion use atomic membership-checked RPCs; direct item updates can change findings only. Server-side database triggers calculate readiness from the saved checklist weights and reject edits to completed findings or checklist definitions. Clients cannot submit authoritative scores, context, or completion timestamps.

The private `inspection-photos` bucket uses shop/inspection/UUID paths and parent-scoped RLS. The application decodes actual JPEG/PNG/WebP bytes, limits size/pixels, strips metadata, and re-encodes JPEG before upload through the authenticated user's client. Display uses 15-minute signed URLs. No service-role key is required. Delete permission is limited to the caller's unregistered objects for failed-upload cleanup; no destructive clinical workflow is exposed.
