# Supabase authentication architecture

Phase 3A prepares authentication without connecting or changing a cloud project.

## Identity and shop authorization

- `auth.users.id` identifies an authenticated person.
- `public.shop_members` links that person to one or more shops and is the authoritative source for `owner`, `manager`, `service_advisor`, and `technician` roles.
- Editable `user_metadata` must never authorize shop access.
- Deleting an Auth user cascades only to their membership rows. Shops remain, and nullable operational references to memberships retain history.

RLS remains enabled with no broad authenticated policies. Phase 3B will implement and test policies that combine `(select auth.uid())`, `shop_members`, and each row's `shop_id`. Every operation must prove that the authenticated user has membership in the target shop. No policy may grant all authenticated users access to all shops.

## SSR session lifecycle

The browser and server client factories return `null` while public Supabase configuration is absent. Server identity checks use `auth.getUser()` rather than trusting the user embedded in `getSession()`.

`lib/supabase/proxy.ts` contains the inactive session-refresh helper. Phase 3B will add a root `proxy.ts`, call that helper, scope its matcher to application routes, and validate refreshed identity with `auth.getClaims()`. It will be activated only after the dedicated MekaReports project, Auth settings, route behavior, and caching behavior can be tested together.

## Phase 3B activation checklist

1. Create and connect only the dedicated MekaReports Supabase project.
2. Apply and verify migrations, then generate database types.
3. Configure email/password Auth and approved redirect URLs.
4. Implement and test membership-scoped RLS for every business table.
5. Build owner onboarding that creates a shop and its initial owner membership safely.
6. Activate SSR session refresh and protect application routes.
7. Test sign-in, refresh, sign-out, multi-shop selection, isolation, and authorization failures end to end.

MekaReports is not connected to Mapou Academy or VannPro.
