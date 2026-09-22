# Phase 9: mechanic shop beta readiness

Scope: the existing local workflow on `mekareports-foundation`, starting from
Phase 8 commit `e350b245af36de3b298b9ef13d025200da246bc2`. Verification ran September
21–22, 2026. This is a local beta build, not a production deployment. No cloud
project was linked, no database reset was performed, and no environment files,
keys, local Supabase ports, or prior migrations were changed.

## Golden workflow and evidence

A separate **Temporary Phase 9 Golden Workflow** shop and four temporary Auth
users exercised owner, manager, service advisor, and technician roles. The
original account and shop were not used for testing.

The browser workflow covered signup, onboarding, sign-in, customer creation,
real VIN decode/manual entry, a Honda Accord with 125,000 miles, appointment,
check-in, linked work order, real AI diagnosis, saving the diagnosis, multipoint
inspection, recommendation, two estimate services plus a part, presenting and
emailing the estimate, public partial approval, technician repair execution,
completion at 125,010 miles, final report, invoice, payments, receipts, emails,
future service reminder, and both customer and vehicle histories.

The approved spark-plug service totaled **$150** ($120 labor + $30 part). The
customer declined the separate $60 cabin-filter service. A $50 payment left
$100, and the final $100 payment left $0. Two receipts preserve their respective
historical balances. The completed work order updated vehicle mileage and the
linked appointment. Report and payment snapshots matched after server restart.

Pre-inspection progress/blockers and completion were exercised through the real
inspection RPC, then reviewed in the browser. Urgent and unchecked findings
prevented a ready result; completing all 18 good findings produced 100% / Likely
Ready. The multipoint inspection saved 22 findings, a measurement, notes, a
recommendation, and a private photo. The photo route rejected forged bytes and
accepted the same upload key twice with exactly one photo record. Native file
picker/camera interaction remains on the device checklist.

Both AI image inputs returned real provider responses, first with explicitly
synthetic illustrations and then with photographs. The dashboard photo returned
battery, oil pressure, brake, seatbelt, airbag, and check-engine warnings; the
part photo returned Spark Plug. Inputs were sent through the actual authenticated
application endpoint. These checks establish image-path functionality, not
diagnostic accuracy or a substitute for physical testing. The model, prompt,
and temperature were preserved.

Temporary photograph sources, not committed to the repository:

- [Dashboard warning photo and source article](https://www.pattypeckhonda.com/manufacturer-information/forward-collision-warning/).
- [Spark-plug01.jpeg, Ralf Schumacher, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Spark-plug01.jpeg).

Five messages were captured by local Mailpit: approval, final report, invoice,
receipt, and service reminder. Each had a visible recipient, useful subject/body,
and working private link. Status was local `sent`, never internet `delivered`.
A deliberately invalid Mailpit endpoint produced a failed communication. Text
preview and Copy Message worked; attempted SMS stayed draft with no send or
delivery timestamps and **SMS provider not configured** displayed.

## Friction found and fixes

| Finding | Resulting change |
| --- | --- |
| Sign Out was not conveniently available; Settings remained a placeholder. | Menu and account-page Sign Out, verified shop/account/role/contact details, honest local provider status. |
| Login network failures could leave confusing feedback. | Pending guard, recoverable connection message, inputs retained; existing successful redirects preserved. |
| An account-service outage could resemble sign-out or hang through retries. | Distinguish unavailable service from missing identity, bound server Supabase fetches to 10 seconds, safe route error boundaries, cookie-refresh proxy tolerates outages. |
| Mobile menu lacked modal keyboard behavior, short-screen access, and reliable focus restoration. | Native dialog, scrollable links, visible Close, Escape, focus containment, restored opener focus, accessible expanded/active states. |
| Sidebar/dashboard still contained obsolete foundation copy and placeholder activity. | Accurate Local Development wording; useful list links; customer questions explicitly unavailable. |
| Work-order detail made the next step difficult to locate. | Status-specific next action and anchors for diagnosis/inspection, estimate/repair, and documents/payment. |
| Diagnosis fields lacked explicit accessible names; footer linked to unrelated hard-coded shop contact details. | Field names and alert messages, contextual return to work order, removed unrelated contact/phone link. |
| Anonymous AI use and raw provider errors were possible. | Verified shop required for diagnosis page/API; safe provider messages; bounded request/text/image input, decoded image normalization, provider timeout. |
| Standalone diagnosis could be mistaken for a saved record. | Explicit notice and work-order path for persistence. |
| Customer, vehicle, appointment, and direct work-order creates lacked stable retry keys. | Frozen form UUIDs, database primary-key enforcement, replay lookup of the existing shop record; pending form controls. |
| Appointment/work-order column grants initially rejected the new create keys in browser testing. | Additive migration grants insert of the ID column only; IDs remain immutable and all existing RLS/constraints remain. |
| Customer/vehicle edits could overwrite newer work; job forms compared a freshly read version instead of the displayed version. | Frozen original version and conditional updates; stale forms ask for reload. Two-tab customer test confirmed no overwrite. |
| Photo upload retries could create duplicates. | Stable upload key/path, replay lookup, client pending guard, no storage overwrite. |
| Appointment-to-work-order mileage was not prefilled. | Carry the selected vehicle's current mileage into the job. |
| Create-form selectors scanned every historical record in 500-row batches. | Limit recent choices to 250, preserve explicitly selected older records, explain starting from searchable detail pages. |
| Text recipients copied from formatted phone numbers failed validation without guidance. | Clear international-number instructions; clipboard failure gives a manual-copy fallback. |
| No local beta feedback pathway. | Small shop-scoped feedback form/inbox, author protection, review status, no external service. |

Observed automation limitation: the browser harness did not reliably commit a
native datetime value until a keyboard change/blur. Keyboard entry worked;
application scheduling and DST regression tests passed. This was not treated
as an application date-storage defect.

## Authorization, sessions, tokens, and failure checks

| Role | UI exercised | Server/database result |
| --- | --- | --- |
| Owner | Shop setup and full front-office workflow through estimate | Full operational rights, own-shop scope only. |
| Manager | Generate, review, and finalize report | Management rights enforced by membership; cross-shop access denied. |
| Service advisor | Invoice, payments, sharing, reminders, feedback review | Customer/vehicle/job/estimate/document/communication management permitted. |
| Technician | Assigned job, start/complete approved work, completion notes | Customer creation and estimate management denied even through direct API/RPC; financial/communication tables remain restricted. Feedback reads limited to own submissions. |

Signup/onboarding, password sign-in, verified authenticated `/login` redirect,
Sign Out, refreshed session, anonymous protected-page redirect, no-shop
onboarding, expired/tampered session, and invalid membership were checked. No
redirect loop was observed. A new tab and restarted application server preserved
the authenticated browser session and saved data. Fully quitting/restarting the
native browser process remains a manual checklist item. The local dashboard is
still available without authentication; protected operational routes are not.

Failure checks covered an unavailable local REST container (restored in a
`finally` block), actual AI provider rejection, VIN with no decoded result,
forged image bytes, incomplete/invalid forms, invalid public token, failed email,
stale edit, and unauthorized actions. Client-visible responses were useful and
did not include SQL errors, stack traces, provider credentials, or raw AI errors.
The provider fault used process-local test settings; no `.env` file changed.

Public approval/document regressions covered invalid, expired, revoked,
superseded, and replayed tokens, cross-shop/source-ID tampering, no anonymous
table access, and customer DTO field whitelists. Tokens are random 256-bit
secrets, not enumerable record IDs. Actual emailed/public HTML excluded an
internal-note marker and $13.37 internal part cost. Shared pages had no staff
sidebar. Customer approval remained simple and readable at phone widths.

Critical create/save/transition actions were audited for pending guards,
transactional constraints, version checks, and request-key replay. Existing
concurrency scripts verified one job per appointment, unique numbering, one
approval audit per accepted response, report/invoice retry reuse, and payment
replay/final-payment races. New database checks cover appointment/work-order
client UUID grants and immutability; actual photo retries produce one row.
This does not claim an offline queue or deduplication of intentionally separate
forms with different request keys.

## Responsive, accessibility, and query review

Thirty-three routes were loaded at **375, 390, 430, 768, and 1440 pixels**:
dashboard; customer/vehicle lists, new, details, and edit; appointment list/new/
detail; work-order list/new/detail/estimate; standalone and saved diagnosis;
inspection list/new/multipoint/pre-inspection; reports; invoice; receipt;
reminders; settings; feedback; and public approval/report/invoice/receipt.
All **165 route/width checks** had no document-level horizontal overflow or
application-error screen. Short-screen 375×500 menu inspection confirmed
scrollable navigation and reachable Sign Out. Representative screenshots and
DOM content were reviewed; this is not a claim of testing physical phones.

Added skip-to-content, explicit diagnosis field labels, active navigation,
48-pixel menu/primary controls, 3-pixel keyboard focus rings, status/error
messages, modal focus containment/restoration, wrapping for long values, and
bottom safe-area spacing. Existing inspection choices are at least 48 pixels
high and retain textual Good/Attention/Urgent/Not Checked labels. Visual review
found readable contrast; formal screen-reader/contrast certification and glove
testing remain manual. Pre-inspection retains Likely Ready / Needs Attention /
High Risk of Inspection Failure / Incomplete language and its non-certification
disclaimer.

Customer, vehicle, appointment, work-order, inspection, and report lists retain
pagination. Related visits are limited to 10, clinical history to 50, financial
and communication history to 25, shared links to 20, and feedback to 50.
Job/customer/inspection choice loading now has a fixed 250-row bound plus the
selected record rather than scanning shop history. Independent option queries
run concurrently; existing listing views avoid per-row lookup loops. Reminders
remain capped at 50 matches with 500 filter choices, and dashboard distinct
in-service vehicle counting scans active jobs only. Large-shop search/autocomplete,
reminder pagination, and load testing remain limitations, not claimed complete.

## Core workflow status matrix

COMPLETE means implemented and verified within the stated local scope.
PARTIAL identifies a material limitation or outstanding manual validation.

| Core feature | Status | Scope / limit |
| --- | --- | --- |
| Auth, verified login redirect, onboarding, Sign Out | COMPLETE | Local Auth; native browser full-restart check remains manual. |
| Owner/manager/advisor/technician authorization | COMPLETE | UI plus RLS/RPC assertions; no new team administration. |
| Customers and linked history | COMPLETE | Search, create/edit, validation, stale protection, bounded history. |
| Vehicles, VIN, manual fallback, mileage | COMPLETE | Actual VIN lookup plus invalid/no-result tests. |
| Appointments, edit, check-in, cancel, no-show | COMPLETE | New York time/DST; linked-job constraints preserved. |
| Work orders and job hierarchy | COMPLETE | Prefills, next step, protected transitions, completion propagation. |
| AI text/dashboard-image/part-image diagnosis | COMPLETE | Real provider requests; auth/input/error bounds; not diagnostic certification. |
| Saved diagnosis | COMPLETE | Work-order persistence and customer-safe document path. |
| Multipoint inspection | COMPLETE | Progress, findings, measurements, notes, recommendations, completion. |
| Pre-inspection readiness | COMPLETE | Blockers/scoring/disclaimer; never official certification. |
| Private inspection photos | COMPLETE | Actual API upload/retry, storage isolation, format/size validation. |
| Recommendations and future services | COMPLETE | Current and future work linked to customer/vehicle/job. |
| Estimates, parts, versions, totals | COMPLETE | Exact pre-tax USD pricing; internal costs kept private. |
| Secure approval / partial / decline / staff decision / revision | COMPLETE | Browser partial approval plus RPC/HTTP revision, staff, replay tests. |
| Repair execution and completion | COMPLETE | Approved work only, installed parts, notes, mileage out, job validation. |
| Final repair report | COMPLETE | Draft/final immutable customer snapshot. |
| Invoices, manual payments, receipts | COMPLETE | Partial/final payments and immutable receipts; does not charge cards. |
| Customer-safe document links | COMPLETE | Whitelisted snapshots, expiry/revocation, no staff sidebar. |
| Local email capture and history | COMPLETE | Five actual Mailpit captures plus truthful failed-send state. |
| SMS preview/copy/unconfigured state | COMPLETE | Draft only; no fake sender. |
| Manual reminders and due-state logic | COMPLETE | Upcoming/due/overdue/mileage/unknown; filters and manual email. |
| Customer and vehicle histories | COMPLETE | Clinical, repair, documents, receipts, communications bounded. |
| Dashboard and navigation | COMPLETE | Real supported metrics; unavailable questions labeled clearly. |
| Local beta feedback | COMPLETE | Shop/author-scoped storage and role-protected review. |
| Responsive web / keyboard accessibility | PARTIAL | Five viewport widths pass; physical devices, gloves, screen readers remain manual. |
| Native Print Preview / exported PDF | PARTIAL | Print views exist; human Letter/A4/multipage preview checklist required. |
| Large-shop performance | PARTIAL | Bounded queries; no production-scale load test or full reminder pagination. |
| Customer questions / team administration / taxes / refunds | PARTIAL | Outside current core beta; clearly deferred, no new product area added. |
| Production Supabase / hosting / backups / monitoring | DEFERRED UNTIL CLOUD | Local stack only. |
| Production email provider / domain setup | DEFERRED UNTIL CLOUD | Mailpit is not internet delivery. |
| Real SMS provider / consent / delivery callbacks | DEFERRED UNTIL CLOUD | Provider abstraction only. |
| Scheduled background reminders | DEFERRED UNTIL CLOUD | Manual reminders only. |
| iOS/Android wrapper and device integrations | DEFERRED UNTIL MOBILE | No Capacitor added. |
| App-store submission | DEFERRED UNTIL MOBILE | No packages or submissions created. |

## iOS / Android follow-up

- Deploy HTTPS API/web origins; device `localhost` is not this workstation.
  Restrict development Mailpit/loopback assumptions to local mode.
- Configure platform Auth callback/deep links, allowed redirects, secure cookie
  behavior, persistence, background resume, and expired-session recovery.
- Test camera/gallery permissions, orientation, large images, HEIC conversion,
  memory use, Android/iOS file-picker behavior, and cancellation. Current inputs
  accept JPEG/PNG/WebP, maximum 5 MB; no native camera bridge is installed.
- Add native print/share/download handling and test PDF export. Browser print
  and a new-tab external link are not guaranteed to work inside a wrapper.
- Open public approval/document links in the appropriate browser and verify
  return navigation, expiring links, safe-area insets, virtual keyboard, and
  fixed menu/header behavior on real notched devices.
- No offline mutation queue exists. Confirm saved status before leaving a page;
  unsaved data and network retry behavior need physical-device testing.

## Manual Print Preview / PDF checks and tester handoff

Use [the mechanic-facing checklist](beta-test-checklist.md), including its notes
template and phone/keyboard checks. A person must check Letter and A4, portrait,
multiple pages, actual Save as PDF output, print cancellation, margins, page
breaks, photos, totals, shop contact, and absence of private/staff-only content:

- [ ] Final repair report
- [ ] Issued invoice
- [ ] Partial-payment receipt
- [ ] Final-payment receipt
- [ ] Completed multipoint inspection
- [ ] Completed pre-inspection with disclaimer
- [ ] Saved diagnosis report

These native print checks remain outstanding; automated HTML/layout inspection
does not replace them. Test records were removed after verification, so testers
should use their own clearly identified test visit from the checklist.

## Database changes and verification commands

Only two new additive migrations were applied with
`npx.cmd supabase migration up --local`:

1. `20260921232757_beta_feedback.sql`: minimal feedback table, index, explicit
   column grants, shop membership/author policies, and protected review status.
2. `20260921234837_job_creation_retry_keys.sql`: appointment/work-order insert-ID
   grants for stable retry keys. Existing immutable IDs, policies, foreign keys,
   ownership checks, and transactional workflow rules stay enforced.

Local security advisors reported **no issues**. All six database suites passed
**392 assertions** (372 prior assertions + 14 feedback + 6 retry-ID assertions).
Existing integration scripts passed for scheduling/DST, job concurrency, repair
workflow/approvals, documents/payments/communications, and private photo storage.

```powershell
npx.cmd supabase test db
npx.cmd supabase db advisors --local --type security --fail-on warn
node --env-file=.env.local scripts/test-job-time.mjs
node --env-file=.env.local scripts/test-job-concurrency.mjs
node --env-file=.env.local scripts/test-repair-workflow.mjs
node --env-file=.env.local scripts/test-document-workflow.mjs
node --env-file=.env.local scripts/test-inspection-storage.mjs
npm.cmd run lint
npm.cmd run build
git diff --check
```

All normal required commands passed. Integration scripts require the production
test server on port 3100 and refuse a Supabase URL other than local port 54331.
Node emitted existing module-type detection warnings; they did not fail tests.

`scripts/test-beta-readiness.mjs` provides an optional manual-browser fixture:
`--prepare` writes temporary credentials; sign up/onboard in the browser with
shop name beginning `Temporary Phase 9`, then `--attach-roles`. Complete the
checklist and use `--record-ids`, `--audit`, `--photos`, `--pre-inspection`,
`--appointment-fixtures`, and `--verify` as described by their assertions.
`--real-photos` additionally needs the two manually sourced ignored files
`supabase/.temp/phase9-dashboard.jpg` and `phase9-part.jpeg`. `--faults` needs a
separate port-3101 process with invalid test AI/provider settings; never edit
environment files for this check. `--auth-faults` briefly stops only the stateless
local REST container and restores it. `--cleanup` removes only that exact
fixture shop, users, photos, feedback, and recipient-matched Mailpit messages.
This helper supports the documented interactive scenario; it is not a one-command
replacement for the browser golden workflow.

## Preservation and repository delivery

Temporary users, shop records, feedback, private storage objects, photo files,
and exact-recipient Mailpit messages were removed after testing. Counts and
full-row hashes matched the saved baseline for all **25 pre-existing tables**,
including the original Auth user, membership, customer, vehicle, job, inspection,
18 checklist findings, and private photo/storage metadata. The new feedback
table was empty after cleanup. No generated Supabase files or credentials are
part of the commit.

Delivery is a local commit named **Prepare MekaReports for mechanic shop beta
testing**. The final chat response records its hash and clean working-tree
status. Nothing was pushed and no PR was created.
