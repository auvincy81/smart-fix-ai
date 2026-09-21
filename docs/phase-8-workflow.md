# Phase 8: reports, payments, communication, and reminders

Phase 8 completes the local end-of-repair workflow on `mekareports-foundation`. It uses the dedicated MekaReports Supabase stack and preserves the existing account and business data. No remote project, keys, environment files, local port configuration, or published migrations were changed.

## Reports and financial documents

Completed work orders can generate a draft in the existing `repair_reports` table. Staff review its customer-facing contents before finalization. The snapshot includes shop/contact, professional report/work-order numbers, customer/vehicle/VIN, visit/completion dates, mileage in/out, complaint, saved diagnosis summaries, approved/declined repairs, performed services, installed parts, customer-facing completion notes, completed inspections/readiness, and future recommendations. Internal notes, part costs, margins, credentials, private photo paths, and database IDs are excluded by explicit database projections.

`/reports` supports pagination, report/customer/VIN/work-order search, and draft/final/void filters. Final snapshots are immutable, including when source records change. Voiding revokes report links and retains history; a replacement can then be generated from the work order. Completion notes are intentionally customer-facing and are shown for staff review before finalization.

`work_order_invoices` stores completed, authorized service totals and customer context. Database decimal arithmetic controls labor, installed parts, fees, subtotal, total, paid amount, and generated balance. Issue freezes prices and context. Draft/issued invoices without payments can be voided and replaced. Paid invoices cannot be silently voided. Amounts are explicitly USD and pre-tax: `tax_amount = 0`; no taxability or jurisdiction rules are inferred. Refunds, adjustments, and configured tax rules are future work.

`work_order_payments` records money already received manually by cash, card, check, bank transfer, or other method. This does not process a charge. The server and database validate amounts, reject nonpositive/over-balance payments, and guard optional reference/note fields against card numbers and credential-labelled text. No credential fields exist. References are transaction IDs only; the conservative digit guard may reject long numeric references. Never enter credentials into free text.

Payments serialize on the work order and reread the locked invoice. Request keys make retries idempotent; competing final payments cannot overpay. Partial payments mark the invoice `partially_paid`; a final payment marks it `paid` with zero balance and a payment timestamp. Each payment creates one `work_order_receipts` record atomically. A composite foreign key requires an actual payment belonging to that invoice/shop/job. Receipts preserve amount, method, payment date, invoice number, and balance at that payment; later payments do not rewrite earlier receipts.

Private per-shop counters produce `RPT-YYYY-NNNNNN`, `INV-YYYY-NNNNNN`, and `RCT-YYYY-NNNNNN` inside database transactions. Locked counter upserts, unique constraints, and one-active-document-per-job indexes control concurrency. Counters are independent by kind, continue across years, and never use browser counts or expose UUIDs as document numbers.

## Sharing and printing

`/documents/[token]` is cookie-free and has no mechanic navigation. A 256-bit random bearer token authorizes exactly one frozen, whitelisted customer document. Only its SHA-256 hash is persisted in `customer_document_links`; the raw token is returned once. Links expire after 30 days and can be revoked. Query parameters cannot select another document. Invalid, expired, and revoked tokens return the unavailable page. Public responses disable caching/indexing/referrer leakage and deny framing.

Shared types include repair report, invoice, receipt, diagnosis, completed inspection/pre-inspection, presented estimate, recommendation, service reminder, and eligible appointment reminder. A shared invoice reflects its balance when the link was created, clearly labelled with a snapshot time; create a new link for an updated balance. Reports and receipts retain their original document snapshots.

The shared `CustomerDocument` DTO and `DocumentView` render on desktop and phone and can support a later server PDF renderer. Print CSS hides navigation/actions, uses white backgrounds and page margins, and avoids splitting rows/headings. The browser Print / Save as PDF control invokes native printing. DOM/loaded-print-rule checks and phone screenshots were verified; the native print dialog blocks this automation surface, so an exported PDF was not automatically inspected.

## Communications and providers

Reusable `/communications/new` supports channel selection, customer email/phone defaults, editable recipient/message, persisted preview, secure link, explicit send, and copy helpers. Entry points are available on reports, invoices, receipts, diagnoses, completed inspections, estimates/approval requests, recommendations, reminders, and eligible appointments. Shared-link metadata/revocation is also available from the send page. Approval requests reuse Phase 7 authorization links and rotate prior unanswered links; they do not invent another approval system.

`customer_communications` retains document/customer/vehicle/job context, channel/type/recipient, message, provider identifier, timestamps, errors, and draft/queued/sent/delivered/failed status support. Token text is never stored in its message. A claimed attempt prevents duplicate sending; completion requires the matching attempt ID. There is no public arbitrary status-update API. Nothing marks a message delivered. SMS with no provider remains draft with no sent/delivered timestamp and explicitly states that no message was sent.

`lib/communications/providers.ts` provides the server-only provider interface. The email adapter uses Mailpit's local send API, never its relay/release functions. It is enabled only with the existing local MekaReports Supabase URL and defaults to `http://127.0.0.1:54334`. Optional `MEKAREPORTS_MAILPIT_URL` must be HTTP loopback; optional `MEKAREPORTS_PUBLIC_ORIGIN` sets the absolute document-link origin. No environment file was modified. Browser clients receive no provider keys.

Successful email means an actual Mailpit capture with a provider message ID, recorded as `sent`, provider `local_mailpit`, and an explicit development-only message. It does not mean internet delivery. Errors are sanitized, without persisting provider responses. If transport succeeds but status recording fails, the row stays queued and staff are told to inspect Mailpit/history before preparing another message. Automatic retry/resending is intentionally absent to avoid duplicates. Raw tokens are ephemeral, so a lost preview requires a fresh message/link; the previous draft stays in history.

Production email/SMS adapters, verified delivery webhooks, trusted canonical origin, and credentials must be configured later. Production scheduling needs a durable cloud scheduler/cron/job queue with idempotency and retry tracking. There are no Next.js background timers or automatic local reminders.

## Reminders and history

`service_reminder_readiness` is a security-invoker view over existing recommendations, customers, and vehicles. It evaluates date and mileage independently. A past date is overdue; today is due; known recorded mileage at/above the target is due. Future targets are upcoming. Unknown mileage is explicitly unknown and never guessed overdue. Inactive recommendation statuses are labelled inactive. Date comparisons use the database's current UTC date; existing dashboard day totals retain New York time.

`/service-reminders` supports readiness, priority, customer, vehicle, and status filters, and manual Email/Text preparation. Requested/confirmed appointments can prepare appointment reminders; completed/cancelled visits cannot. Customer and vehicle histories preserve all prior sections and add organized report, invoice/payment/receipt, and communication sections. Lists state their record limits. Dashboard Upcoming Services now uses real upcoming readiness; existing appointments, active vehicles/jobs, approval, and completion counts remain real. Customer Questions remains honestly labelled as not implemented.

## Authorization and migrations

All new business tables have shop-scoped RLS and no anonymous table access. Owner/manager/service_advisor manage financial documents, sharing, and communications; technicians can read repair reports but cannot access financial or communication data. Every server action verifies the current authenticated user/shop role. Database helpers independently verify membership from `shop_members`, never editable user metadata. Public wrappers are security invokers; narrow definer helpers live in the non-exposed private schema with fixed empty search paths and explicit execution grants. No service-role key is used.

New migrations, preflighted in rollback transactions and applied using `npx.cmd supabase migration up --local` without reset:

1. `20260921222527_reports_communications_reminders.sql`: additive financial, snapshot, sharing, communication, readiness, constraint, and RLS architecture.
2. `20260921225147_document_delivery_compatibility.sql`: appointment reminders use the existing requested/confirmed statuses.
3. `20260921225823_flatten_repair_report_inspection_sections.sql`: flatten completed inspection sections into the common document DTO for future generation, preserving existing final snapshots.
4. `20260921230501_payment_reference_privacy_guard.sql`: reject credential-labelled text in payment references as well as notes.

## Verification

- Local database suite: **372 assertions passed**, including 72 new document assertions and all 300 previous assertions. Covers shop/role/anonymous isolation, private-helper restrictions, invalid/expired/revoked tokens, whitelisted content, final immutability, exact money, overpayments, credential guards, receipt/payment foreign keys, truthful SMS, and date/mileage readiness.
- Local security advisors: **no issues found** (`npx.cmd supabase db advisors --local --type security --fail-on warn`).
- `scripts/test-document-workflow.mjs`: actual Auth/PostgREST/public HTTP checks using isolated shops. Tests concurrent report/invoice retries, concurrent payment retries/final payments, exact balances, immutable receipts, all fixture document types including requested appointment reminders, public HTML headers/isolation, source-ID query tampering, revocation, cross-shop/anonymous access, approval-message link rotation, and manual reminder/SMS state.
- Browser: completed work order → generated/reviewed/final report → private unauthenticated report → real email capture → issued invoice → partial/final payment → two receipts → unauthenticated receipt → SMS unavailable/draft → filtered future recommendation → manual reminder email → customer/vehicle histories. Report customer/VIN search and final filtering were exercised.
- Monetary fixture: $180.00 labor + $91.10 installed parts + $5.00 fees = **$276.10**. The declined $60.00 repair is excluded. First payment $100.00 leaves $176.10; second payment $176.10 leaves $0.00. Each has its own historical receipt.
- Persistence: after production-server restart, full report/invoice/receipt snapshot equality, payment balances/statuses, working emailed links, communication rows, and public receipt HTML remained correct. `--verify-browser-fixture` verifies actual Mailpit report/reminder bodies and working links; both email rows are local `sent` with delivery timestamps unset, and receipt SMS stays draft/unsent.
- AI/VIN: a real diagnostic request decoded the temporary Honda VIN, returned a structured result, saved successfully to the work order, appeared in the final report, and produced a working diagnosis share link.
- Inspections: both existing checklist types completed through their real save RPCs, pre-inspection showed 100% / likely ready, and customer reports included their results without internal technician notes. Existing clinical tests and `scripts/test-inspection-storage.mjs` passed private upload/download, signed access, image decoding, forged/oversized input rejection, and isolation checks.
- Approval/repair: `scripts/test-repair-workflow.mjs` passed existing monetary, concurrency, partial/full approval, decline, version/audit, completion, installed-parts, mileage/appointment, and future-recommendation regressions.
- Normal `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` passed. All pre-Phase-8 counts/full-row hashes matched across 20 tables after exact fixture cleanup. The original Auth account, shop/membership, customer, vehicle, work order, inspection, 18 checklist items, and private photo/storage metadata remain unchanged. All five new business tables are empty after cleanup; temporary Mailpit messages were removed by exact recipient/message IDs. The temporary server was stopped and browser tabs closed. No generated Supabase contents are committed.

To repeat integration checks, start the built app on port 3100 with local Supabase on 54331, then run `node --env-file=.env.local scripts/test-document-workflow.mjs`. It refuses other database targets and removes its own fixtures. Optional `--create-browser-fixture`, `--verify-browser-fixture`, and `--cleanup-browser-fixture` modes support the browser cycle. The ignored fixture file holds temporary credentials/snapshots only and is removed on cleanup. Cleanup deletes only fixture-owned records and exact recipient-matched Mailpit messages.

## Files created

- `app/communications/error.tsx`
- `app/communications/new/page.tsx`
- `app/documents/[token]/not-found.tsx`
- `app/documents/[token]/page.tsx`
- `app/documents/error.tsx`
- `app/invoices/[id]/page.tsx`
- `app/invoices/error.tsx`
- `app/receipts/[id]/page.tsx`
- `app/receipts/error.tsx`
- `app/reports/[id]/page.tsx`
- `app/reports/error.tsx`
- `app/service-reminders/error.tsx`
- `components/documents/document-view.tsx`
- `components/documents/forms.tsx`
- `components/documents/reminders-list.tsx`
- `components/documents/reports-list.tsx`
- `components/documents/send-form.tsx`
- `components/documents/shop-documents.tsx`
- `lib/communications/providers.ts`
- `lib/documents/actions.ts`
- `lib/documents/data.ts`
- `lib/documents/validation.ts`
- `scripts/test-document-workflow.mjs`
- Four migrations listed above
- `supabase/tests/documents.test.sql`
- `docs/phase-8-workflow.md`

## Files modified

- `app/appointments/[id]/page.tsx`
- `app/customers/[id]/page.tsx`
- `app/diagnoses/[id]/page.tsx`
- `app/estimates/[id]/page.tsx`
- `app/globals.css`
- `app/inspections/[id]/page.tsx`
- `app/reports/page.tsx`
- `app/service-reminders/page.tsx`
- `app/vehicles/[id]/page.tsx`
- `app/work-orders/[id]/page.tsx`
- `components/app-shell.tsx`
- `components/jobs/dashboard-snapshot.tsx`
- `components/repairs/workspace.tsx`
- `docs/supabase-auth-architecture.md`
- `next.config.ts`
- `proxy.ts`
- `types/database.ts`
