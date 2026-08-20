# MekaReports

**Diagnose. Document. Manage.**

MekaReports is a mechanic-shop operations platform evolving from Smart Fix AI. It combines AI-assisted vehicle diagnosis with the workflow and records a repair shop needs to serve customers consistently.

## Shop workflow

Customer → Vehicle → Appointment → Work Order → Diagnosis → Inspection → Customer Approval → Repair → Repair Report → Future Service Recommendation

## Delivery phases

### Phase 1 — Application foundation

- Professional responsive application shell and shop dashboard.
- Preserved AI Diagnosis at `/diagnosis` and its server-side `/api/diagnose` endpoint.
- Preserved VIN lookup, symptoms and diagnostic-code input, dashboard and part photo analysis, severity, likely causes, tests, cost guidance, and safety information.

### Phase 2 — Local data architecture

- Local Supabase configuration and PostgreSQL migration under `supabase/`.
- Core relational model for shops, customers, vehicles, appointments, work orders, diagnoses, inspections, services, service recommendations, questions, and repair reports.
- Shop-scoped composite foreign keys prevent tenant-owned records from referencing records belonging to another shop.
- Row Level Security is enabled on every business table with no public policies. Until Phase 3, direct public-client access is intentionally denied.
- Framework-independent TypeScript domain types live in `types/mekareports.ts`.

The schema is local and is **not linked to any cloud project**. MekaReports is not connected to Mapou Academy or VannPro, and neither project is used or modified.

### Phase 3A — Supabase SDK and Auth foundation

- Browser and server Supabase factories use `@supabase/ssr` and safely return `null` without public configuration.
- A controlled authentication service supports email/password sign-in, sign-up, sign-out, verified current-user lookup, and future shop context lookup.
- `/login` provides the MekaReports account UI without protecting or changing access to the local dashboard.
- `shop_members` remains the authoritative multi-shop role source; roles are never read from editable user metadata.
- A new migration links `shop_members.user_id` to `auth.users(id)` with membership cleanup when an Auth user is deleted.
- The cloud connection, session-refresh proxy activation, and production RLS policies remain disabled.

### Phase 3B — Planned cloud activation

- Create and connect a dedicated MekaReports Supabase project.
- Apply and verify migrations, configure Auth, and generate database types.
- Activate SSR session refresh.
- Implement and test `auth.uid()` + `shop_members` + `shop_id` RLS policies.
- Create owner/shop onboarding and protect application routes.

The intended authorization and proxy architecture is documented in [`docs/supabase-auth-architecture.md`](docs/supabase-auth-architecture.md). Do not use business tables from a browser client until shop-scoped policies are implemented and tested.

## Local configuration

Copy `.env.example` to `.env.local` and fill only credentials for the dedicated MekaReports services. `.env.local` is ignored by Git. Never commit API keys.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

The Supabase CLI and a Docker-compatible container runtime are required to execute the full local database stack. When available, validate the migration with:

```bash
npx supabase start
npx supabase db reset
```

Do not run `supabase link` until MekaReports has its own reviewed Supabase project.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
git diff --check
```
