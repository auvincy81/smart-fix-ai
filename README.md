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

The schema is local and is **not linked to any cloud project**. No Mapou Academy or VannPro database or Supabase project is used or modified by MekaReports.

### Phase 3 — Dedicated Supabase connection

Phase 3 will create and connect MekaReports to its own Supabase cloud project, add authentication, link `shop_members.user_id` to Supabase Auth, implement shop-scoped RLS policies, generate database types, and build real CRUD workflows. Do not use the schema from a browser client until those authorization policies exist.

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
