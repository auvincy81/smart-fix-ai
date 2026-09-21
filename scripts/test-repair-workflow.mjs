import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Local only: node --env-file=.env.local scripts/test-repair-workflow.mjs
// Start the application on port 3100 first. No service-role key is used.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "http://127.0.0.1:54331", "Refusing any other Supabase target");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const app = "http://127.0.0.1:3100";
const fixtureFile = "supabase/.temp/phase7-browser.json";
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = ({ data, error }) => { assert.equal(error, null, error?.message); return data; };
const uuid = (id) => { assert.match(id, /^[0-9a-f-]{36}$/); return id; };
const sql = (q) => execFileSync("docker", ["exec", "supabase_db_mekareports", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8" }).trim();
async function cleanup(f) {
  const userId = uuid(f.userId);
  if (f.shopId) {
    const shop = uuid(f.shopId);
    assert.equal(sql(`select count(*) from shops where id='${shop}' and name like 'Temporary Phase 7%'`), "1");
    const db = f.client ?? client();
    if (!f.client) ok(await db.auth.signInWithPassword({ email: f.email, password: f.password }));
    const photos = ok(await db.from("inspection_photos").select("storage_path").eq("shop_id", shop));
    sql(`delete from inspection_photos where shop_id='${shop}'`);
    if (photos.length) ok(await db.storage.from("inspection-photos").remove(photos.map((p) => p.storage_path)));
    ok(await db.auth.signOut());
    sql(`begin; delete from customer_approval_audits where shop_id='${shop}'; delete from customer_approval_requests where shop_id='${shop}'; delete from work_order_estimate_items where shop_id='${shop}'; delete from work_order_estimates where shop_id='${shop}'; delete from work_order_parts where shop_id='${shop}'; delete from work_order_services where shop_id='${shop}'; delete from service_recommendations where shop_id='${shop}'; delete from diagnoses where shop_id='${shop}'; delete from inspections where shop_id='${shop}'; delete from work_orders where shop_id='${shop}'; delete from appointments where shop_id='${shop}'; delete from vehicles where shop_id='${shop}'; delete from customers where shop_id='${shop}'; delete from auth.users where id='${userId}'; delete from shops where id='${shop}'; commit;`);
  } else sql(`delete from auth.users where id='${userId}'`);
}
const fixtures = [];
async function fixture(label) {
  const f = { client: client(), email: `phase7-${randomUUID()}@example.test`, password: `Phase7-Test!${randomUUID()}` };
  const auth = ok(await f.client.auth.signUp({ email: f.email, password: f.password }));
  assert.ok(auth.session);
  f.userId = auth.user.id; fixtures.push(f);
  f.shopId = ok(await f.client.rpc("create_initial_shop", { p_name: `Temporary Phase 7 ${label}` }));
  f.memberId = ok(await f.client.from("shop_members").select("id").single()).id;
  f.customerId = ok(await f.client.from("customers").insert({ shop_id: f.shopId, first_name: "PhaseSeven", last_name: "Verification" }).select("id").single()).id;
  f.vehicleId = ok(await f.client.from("vehicles").insert({ shop_id: f.shopId, customer_id: f.customerId, make: "HONDA", model: "Accord", year: 2003, vin: "1HGCM82633A004352", mileage: 125000 }).select("id").single()).id;
  f.appointmentId = ok(await f.client.from("appointments").insert({ shop_id: f.shopId, customer_id: f.customerId, vehicle_id: f.vehicleId, scheduled_start: new Date().toISOString(), status: "confirmed" }).select("id").single()).id;
  f.jobId = ok(await f.client.from("work_orders").insert({ shop_id: f.shopId, customer_id: f.customerId, vehicle_id: f.vehicleId, appointment_id: f.appointmentId, mileage_in: 125000, status: "open", customer_complaint: "Temporary verification scenario: warm rough idle, code P0301, no overheating." }).select("id").single()).id;
  f.inspectionId = ok(await f.client.rpc("create_inspection", { p_work_order: f.jobId, p_type: "multipoint", p_state: "", p_request_key: randomUUID(), p_technician: f.memberId }));
  f.itemId = ok(await f.client.from("inspection_items").select("id").eq("inspection_id", f.inspectionId).order("sort_order").limit(1).single()).id;
  ok(await f.client.from("inspection_items").update({ condition: "attention", recommendation: "Temporary test finding: review front tire condition before service." }).eq("id", f.itemId));
  return f;
}
const manage = async (f, action, data = {}, job = f.jobId) => ok(await f.client.rpc("manage_repair", { p_job: job, p_action: action, p_data: data }));
const post = (token, body) => fetch(`${app}/api/approvals/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const resultBody = (decisions) => ({ decisions, name: "Temporary Customer", note: "Test authorization only", acknowledge: true });

if (process.argv.includes("--cleanup-browser-fixture")) {
  const f = JSON.parse(readFileSync(fixtureFile, "utf8"));
  assert.match(f.email, /^phase7-[0-9a-f-]+@example\.test$/);
  await cleanup(f); unlinkSync(fixtureFile);
  console.log("PASS: exact browser fixture account, shop, records, and any test images removed.");
} else if (process.argv.includes("--create-browser-fixture")) {
  assert.equal(existsSync(fixtureFile), false, "Clean up the previous browser fixture first");
  try {
    const f = await fixture("browser verification");
    const stored = Object.fromEntries(Object.entries(f).filter(([key]) => key !== "client"));
    writeFileSync(fixtureFile, JSON.stringify(stored, null, 2));
    console.log(JSON.stringify(stored, null, 2));
  } catch (error) { for (const f of fixtures.reverse()) await cleanup(f); throw error; }
} else {
  try {
    const a = await fixture("API A"); const b = await fixture("API B");
    const recommendation = await manage(a, "recommend", { title: "Fixture tire service", description: "Customer-safe explanation", priority: "high", inspection_item_id: a.itemId, request_key: randomUUID() });
    const first = await manage(a, "from_recommendation", { id: recommendation.id });
    assert.equal((await manage(a, "from_recommendation", { id: recommendation.id })).id, first.id);
    await manage(a, "service", { id: first.id, description: "Tire service", customer_description: "Customer-safe repair", labor_hours: "1.50", labor_rate: "120", fees_amount: "5", sort_order: 0 });
    const partInput = { service_id: first.id, part_name: "Test part", quantity: "2", unit_price: "45.55", unit_cost: "13.37", request_key: randomUUID() };
    const parts = await Promise.all([manage(a, "part", partInput), manage(a, "part", partInput)]);
    assert.equal(parts[0].id, parts[1].id, "simultaneous part retries are idempotent");
    const second = await manage(a, "service", { description: "Optional service", labor_hours: "1", labor_rate: "60", sort_order: 1, request_key: randomUUID() });
    const future = await manage(a, "recommend", { title: "Future maintenance test", priority: "low", request_key: randomUUID() });
    await manage(a, "future", { id: future.id, recommended_date: "2027-01-15", recommended_mileage: "130000" });
    const drafts = await Promise.all([manage(a, "draft"), manage(a, "draft")]);
    assert.equal(drafts[0].id, drafts[1].id, "simultaneous draft creation returns one estimate");
    await manage(a, "estimate_notes", { customer_note: "Visible estimate note", internal_note: "NEVER_EXPOSE_INTERNAL_PHASE7" });
    const { token } = await manage(a, "present");
    const anon = client();
    const payload = ok(await anon.rpc("read_customer_approval", { p_token: token }));
    assert.equal(payload.grand_total, "336.10");
    assert.equal(payload.items[0].labor_amount, "180.00");
    assert.equal(payload.items[0].parts_amount, "91.10");
    for (const secret of ["NEVER_EXPOSE_INTERNAL_PHASE7", "unit_cost", "13.37", a.userId, a.jobId, a.customerId]) assert.ok(!JSON.stringify(payload).includes(secret));
    const page = await fetch(`${app}/approve/${token}`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("cache-control"), /no-store/);
    assert.equal(page.headers.get("referrer-policy"), "no-referrer");
    const html = await page.text();
    assert.ok(html.includes("Review Your Repair Estimate"));
    for (const secret of ["NEVER_EXPOSE_INTERNAL_PHASE7", "unit_cost", "13.37", a.jobId, a.customerId]) assert.ok(!html.includes(secret), `Public HTML contains forbidden field ${secret}`);
    assert.deepEqual(ok(await b.client.from("work_order_estimates").select("id").eq("id", drafts[0].id)), []);
    assert.deepEqual(ok(await b.client.from("work_order_parts").select("id").eq("id", parts[0].id)), []);
    assert.ok((await b.client.rpc("manage_repair", { p_job: a.jobId, p_action: "revise", p_data: {} })).error);
    assert.equal((await fetch(`${app}/approve/${"0".repeat(64)}`)).status, 404);
    assert.equal((await post("invalid", resultBody([]))).status, 404);
    assert.equal((await post(token, resultBody([{ line: 999, decision: "approved" }, { line: 2, decision: "declined" }]))).status, 409);
    const choice = resultBody([{ line: 1, decision: "approved" }, { line: 2, decision: "declined" }]);
    const concurrent = await Promise.all([post(token, choice), post(token, choice)]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409], "one response wins; replay cannot duplicate audit");
    assert.equal(ok(await a.client.from("customer_approval_audits").select("id")).length, 1);
    assert.deepEqual(ok(await b.client.from("customer_approval_audits").select("id").eq("shop_id", a.shopId)), [], "another shop cannot read an existing authorization");
    assert.deepEqual(ok(await b.client.from("work_order_services").select("id").eq("id", first.id)), []);
    assert.equal(ok(await a.client.from("work_order_estimates").select("status").eq("id", drafts[0].id).single()).status, "partially_approved");
    assert.ok((await a.client.rpc("manage_repair", { p_job: a.jobId, p_action: "start", p_data: { id: second.id } })).error);
    await manage(a, "start", { id: first.id });
    await manage(a, "complete_service", { id: first.id, completion_note: "Temporary repair verification completed." });
    await manage(a, "complete_job", { mileage_out: "125010" });
    assert.equal(ok(await a.client.from("work_orders").select("status,mileage_out").eq("id", a.jobId).single()).status, "completed");
    assert.equal(ok(await a.client.from("vehicles").select("mileage").eq("id", a.vehicleId).single()).mileage, 125010);
    assert.equal(ok(await a.client.from("appointments").select("status").eq("id", a.appointmentId).single()).status, "completed");
    assert.equal(ok(await a.client.from("work_order_parts").select("status").eq("id", parts[0].id).single()).status, "installed");
    assert.equal(ok(await a.client.from("service_recommendations").select("status,recommended_mileage").eq("id", future.id).single()).recommended_mileage, 130000);
    // All-declined and separately recorded phone authorization; revise without overwriting the old audit.
    await manage(b, "service", { description: "Optional B", labor_hours: "0.10", labor_rate: "0.20", request_key: randomUUID() });
    const eb = await manage(b, "draft");
    const oldLink = await manage(b, "present");
    ok(await b.client.rpc("record_staff_approval", { p_estimate: eb.id, p_decisions: [{ line: 1, decision: "declined" }], p_name: "Phone fixture", p_note: "Declined by phone", p_ack: true, p_method: "phone" }));
    assert.equal(ok(await b.client.from("work_orders").select("status").eq("id", b.jobId).single()).status, "open");
    assert.equal(ok(await anon.rpc("read_customer_approval", { p_token: oldLink.token })), null);
    await manage(b, "revise");
    const newer = await manage(b, "present");
    assert.equal(ok(await b.client.from("work_order_estimates").select("status").eq("id", eb.id).single()).status, "declined");
    assert.equal(ok(await b.client.from("customer_approval_audits").select("id")).length, 1);
    assert.equal(ok(await anon.rpc("read_customer_approval", { p_token: newer.token })).grand_total, "0.02", "fractional decimal math is exact");
    assert.equal((await post(newer.token, resultBody([{ line: 1, decision: "approved" }]))).status, 200);
    assert.equal(ok(await b.client.from("customer_approval_audits").select("id")).length, 2);
    // Independent jobs contend on the private counter; every estimate number remains unique.
    const jobs = await Promise.all(Array.from({ length: 6 }, async () => ok(await b.client.from("work_orders").insert({ shop_id: b.shopId, customer_id: b.customerId, vehicle_id: b.vehicleId, status: "open" }).select("id").single()).id));
    await Promise.all(jobs.map((job) => manage(b, "draft", {}, job)));
    const numbers = ok(await b.client.from("work_order_estimates").select("estimate_number").in("work_order_id", jobs));
    assert.equal(new Set(numbers.map((n) => n.estimate_number)).size, 6);
    await manage(b, "service", { description: "In-person authorization fixture", labor_hours: "1", labor_rate: "10", request_key: randomUUID() }, jobs[0]);
    await manage(b, "present", {}, jobs[0]);
    const inPersonEstimate = ok(await b.client.from("work_order_estimates").select("id").eq("work_order_id", jobs[0]).single());
    ok(await b.client.rpc("record_staff_approval", { p_estimate: inPersonEstimate.id, p_decisions: [{ line: 1, decision: "approved" }], p_name: "In-person fixture", p_note: "Authorized at counter", p_ack: true, p_method: "in_person" }));
    assert.equal(ok(await b.client.from("customer_approval_audits").select("method").eq("estimate_id", inPersonEstimate.id).single()).method, "in_person");
    console.log("PASS: exact pricing, idempotent creation, concurrent numbering and response replay, unauthenticated public HTML/API, private-field exclusion, tenant isolation, partial/all approval, phone decline, revisions/audit retention, repair/parts completion, mileage/appointment synchronization, future recommendations.");
  } finally { for (const f of fixtures.reverse()) await cleanup(f); }
}
