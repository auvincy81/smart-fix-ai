# Supabase authentication architecture

Phase 4 uses the dedicated local MekaReports Supabase stack. No remote project is linked or changed.

## Identity and shop authorization

- `auth.users.id` identifies an authenticated person.
- `public.shop_members` links that person to one or more shops and is the authoritative source for `owner`, `manager`, `service_advisor`, and `technician` roles.
- Editable `user_metadata` must never authorize shop access.
- Deleting an Auth user cascades only to their membership rows. Shops remain, and nullable operational references to memberships retain history.

RLS policies now cover shops, own memberships, customers, and vehicles. Every business operation is scoped by `(select auth.uid())`, authoritative membership, and the record's `shop_id`. Other business tables remain closed pending their workflow phases. See [Phase 4 implementation and verification](phase-4-workflow.md).

## SSR session lifecycle

The browser and server client factories return `null` while public Supabase configuration is absent. Server identity checks use `auth.getUser()` rather than trusting the user embedded in `getSession()`.

The root `proxy.ts` activates `lib/supabase/proxy.ts` only for login, onboarding, customers, vehicles, and the vehicle VIN endpoint. It refreshes cookies using `getClaims()`; pages and server actions still verify the current user with `getUser()`. The dashboard and legacy workflows remain open. Shop-context results are cached only within a React server request, never globally across users.

## Shop context and onboarding

`requireShopContext()` redirects signed-out users to `/login` and users without membership to `/onboarding`. Database errors produce a recoverable error view rather than treating a failed lookup as an absent membership. If multiple memberships exist, the earliest membership (then ID as a stable tie-breaker) is used until a shop selector is introduced.

The `create_initial_shop` RPC uses only `auth.uid()`, locks the Auth user row, rejects existing membership, and creates the shop plus owner membership in one transaction. `SECURITY DEFINER` is required because clients have no shop or membership INSERT permission. The function has an empty search path, fully qualified table references, and authenticated-only execution. No authorization helper or recursive membership policy is required.

Server actions validate fields with Zod and derive the shop ID from context. RLS remains the final authority for direct API requests. Column-level UPDATE grants also prevent changing a customer's or vehicle's shop ID, including users with access to more than one shop.

MekaReports is not connected to Mapou Academy or VannPro.
