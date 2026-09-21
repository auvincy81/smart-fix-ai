import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { documentSchema } from "../lib/documents/validation.ts";

// Local only: node --env-file=.env.local scripts/test-document-workflow.mjs
// Start the application on port 3100 first. No service-role key is used.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "http://127.0.0.1:54331", "Refusing any other Supabase target");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const app = "http://127.0.0.1:3100";
const fixtureFile = "supabase/.temp/phase8-browser.json";
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = ({ data, error }) => { assert.equal(error, null, error?.message); return data; };
const uuid = (id) => { assert.match(id, /^[0-9a-f-]{36}$/); return id; };
const sql = (q) => execFileSync("docker", ["exec", "supabase_db_mekareports", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8" }).trim();
async function cleanup(f) {
  const userId = uuid(f.userId);
  if (f.shopId) {
    const shop = uuid(f.shopId);
    assert.equal(sql(`select count(*) from shops where id='${shop}' and name like 'Temporary Phase 8%'`), "1");
    const db = f.client ?? client();
    if (!f.client) ok(await db.auth.signInWithPassword({ email: f.email, password: f.password }));
    const photos = ok(await db.from("inspection_photos").select("storage_path").eq("shop_id", shop));
    sql(`delete from inspection_photos where shop_id='${shop}'`);
    if (photos.length) ok(await db.storage.from("inspection-photos").remove(photos.map((p) => p.storage_path)));
    ok(await db.auth.signOut());
    sql(`begin; delete from customer_communications where shop_id='${shop}'; delete from customer_document_links where shop_id='${shop}'; delete from work_order_receipts where shop_id='${shop}'; delete from work_order_payments where shop_id='${shop}'; delete from work_order_invoices where shop_id='${shop}'; delete from repair_reports where shop_id='${shop}'; delete from customer_approval_audits where shop_id='${shop}'; delete from customer_approval_requests where shop_id='${shop}'; delete from work_order_estimate_items where shop_id='${shop}'; delete from work_order_estimates where shop_id='${shop}'; delete from work_order_parts where shop_id='${shop}'; delete from work_order_services where shop_id='${shop}'; delete from service_recommendations where shop_id='${shop}'; delete from diagnoses where shop_id='${shop}'; delete from inspections where shop_id='${shop}'; delete from work_orders where shop_id='${shop}'; delete from appointments where shop_id='${shop}'; delete from vehicles where shop_id='${shop}'; delete from customers where shop_id='${shop}'; delete from auth.users where id='${userId}'; delete from shops where id='${shop}'; commit;`);
  } else sql(`delete from auth.users where id='${userId}'`);
}
const fixtures = [];
async function fixture(label) {
  const f = { client: client(), email: `phase8-${randomUUID()}@example.test`, password: `Phase8-Test!${randomUUID()}` };
  const auth = ok(await f.client.auth.signUp({ email: f.email, password: f.password }));
  assert.ok(auth.session);
  f.userId = auth.user.id; fixtures.push(f);
  f.shopId = ok(await f.client.rpc("create_initial_shop", { p_name: `Temporary Phase 8 ${label}` }));
  f.memberId = ok(await f.client.from("shop_members").select("id").single()).id;
  f.customerId = ok(await f.client.from("customers").insert({ shop_id: f.shopId, first_name: "PhaseEight", last_name: "Verification", email: f.email, phone: "+15555550123" }).select("id").single()).id;
  f.vehicleId = ok(await f.client.from("vehicles").insert({ shop_id: f.shopId, customer_id: f.customerId, make: "HONDA", model: "Accord", year: 2003, vin: "1HGCM82633A004352", mileage: 125000 }).select("id").single()).id;
  f.appointmentId = ok(await f.client.from("appointments").insert({ shop_id: f.shopId, customer_id: f.customerId, vehicle_id: f.vehicleId, scheduled_start: new Date().toISOString(), status: "confirmed" }).select("id").single()).id;
  f.jobId = ok(await f.client.from("work_orders").insert({ shop_id: f.shopId, customer_id: f.customerId, vehicle_id: f.vehicleId, appointment_id: f.appointmentId, mileage_in: 125000, status: "open", customer_complaint: "Temporary verification scenario: warm rough idle, code P0301, no overheating." }).select("id").single()).id;
  f.inspectionId = ok(await f.client.rpc("create_inspection", { p_work_order: f.jobId, p_type: "multipoint", p_state: "", p_request_key: randomUUID(), p_technician: f.memberId }));
  f.itemId = ok(await f.client.from("inspection_items").select("id").eq("inspection_id", f.inspectionId).order("sort_order").limit(1).single()).id;
  ok(await f.client.from("inspection_items").update({ condition: "attention", recommendation: "Temporary test finding: review front tire condition before service." }).eq("id", f.itemId));
  return f;
}
const rpc = async (f, fn, args) => ok(await f.client.rpc(fn,args));
const manage = (f, action, data={}) => rpc(f,"manage_repair",{p_job:f.jobId,p_action:action,p_data:data});
const doc = (f, kind, id, action, data={}) => rpc(f,"manage_document",{p_kind:kind,p_id:id,p_action:action,p_data:data});
async function completedFixture(label) {
  const f=await fixture(label);
  // Exercise both existing inspection types; all records are isolated temporary fixtures.
  f.preInspectionId=await rpc(f,"create_inspection",{p_work_order:f.jobId,p_type:"pre_inspection",p_state:"NY",p_request_key:randomUUID(),p_technician:f.memberId});
  for(const inspectionId of [f.inspectionId,f.preInspectionId]){
    const items=ok(await f.client.from("inspection_items").select("*").eq("inspection_id",inspectionId)).map(i=>({...i,condition:"good",technician_note:"INTERNAL_PHASE8_MARKER"}));
    const parent=ok(await f.client.from("inspections").select("updated_at").eq("id",inspectionId).single());
    await rpc(f,"save_inspection",{p_id:inspectionId,p_updated_at:parent.updated_at,p_items:items,p_summary:"Temporary completed inspection",p_complete:true,p_acknowledge_unchecked:false});
  }
  ok(await f.client.from("work_orders").update({technician_notes:"INTERNAL_PHASE8_MARKER"}).eq("id",f.jobId));
  const service=await manage(f,"service",{description:"Temporary authorized repair",customer_description:"Customer-safe completed repair",labor_hours:"1.50",labor_rate:"120",fees_amount:"5",request_key:randomUUID()});
  await manage(f,"part",{service_id:service.id,part_name:"Temporary installed part",quantity:"2",unit_price:"45.55",unit_cost:"13.37",request_key:randomUUID()});
  await manage(f,"service",{description:"Temporary declined repair",labor_hours:"1",labor_rate:"60",sort_order:1,request_key:randomUUID()});
  f.recommendationId=(await manage(f,"recommend",{title:"Temporary future maintenance",description:"Review the tires at the next visit.",priority:"medium",recommended_date:"2027-01-15",recommended_mileage:"130000",request_key:randomUUID()})).id;
  f.estimateId=(await manage(f,"draft")).id;
  await manage(f,"estimate_notes",{customer_note:"Customer-safe note",internal_note:"INTERNAL_PHASE8_MARKER"});
  const link=await manage(f,"present");
  const anon=client();ok(await anon.rpc("submit_customer_approval",{p_token:link.token,p_decisions:[{line:1,decision:"approved"},{line:2,decision:"declined"}],p_name:"Temporary Customer",p_note:"Approve one repair",p_ack:true}));
  await manage(f,"start",{id:service.id});await manage(f,"complete_service",{id:service.id,completion_note:"Repair checked and completed."});await manage(f,"complete_job",{mileage_out:"125010"});
  return f;
}
async function removeMail(f) {
 const query=await fetch(`http://127.0.0.1:54334/api/v1/search?query=${encodeURIComponent(`to:${f.email}`)}`);assert.equal(query.status,200);const data=await query.json();
 const ids=(data.messages||[]).map(m=>m.ID);if(ids.length){const deleted=await fetch("http://127.0.0.1:54334/api/v1/messages",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({IDs:ids})});assert.equal(deleted.status,200);}
}
if(process.argv.includes("--verify-browser-fixture")){
 const f=JSON.parse(readFileSync(fixtureFile,"utf8"));f.client=client();ok(await f.client.auth.signInWithPassword({email:f.email,password:f.password}));
 const reports=ok(await f.client.from("repair_reports").select("report_number,report_status,report_snapshot").eq("work_order_id",f.jobId));assert.equal(reports.length,1);assert.equal(reports[0].report_status,"final");documentSchema.parse(reports[0].report_snapshot);
 const invoices=ok(await f.client.from("work_order_invoices").select("invoice_number,status,total,amount_paid,balance_due").eq("work_order_id",f.jobId));assert.deepEqual(invoices.map(i=>({status:i.status,total:i.total,amount_paid:i.amount_paid,balance_due:i.balance_due})),[{status:"paid",total:276.1,amount_paid:276.1,balance_due:0}]);
 const receipts=ok(await f.client.from("work_order_receipts").select("receipt_number,snapshot").eq("work_order_id",f.jobId).order("receipt_number"));assert.equal(receipts.length,2);for(const r of receipts)documentSchema.parse(r.snapshot);
 const persistent={reports,invoices,receipts};if(f.verifiedDocuments)assert.deepEqual(persistent,f.verifiedDocuments,"reports, invoices and receipts survive restart unchanged");else f.verifiedDocuments=persistent;
 const communications=ok(await f.client.from("customer_communications").select("type,channel,status,provider,provider_message_id,sent_at,delivered_at,error_message").eq("shop_id",f.shopId));
 for(const type of ["repair_report","service_reminder"]){const c=communications.find(c=>c.type===type&&c.channel==="email");assert.equal(c.status,"sent");assert.equal(c.provider,"local_mailpit");assert.ok(c.provider_message_id);assert.ok(c.sent_at);assert.equal(c.delivered_at,null);}
 const sms=communications.find(c=>c.type==="receipt"&&c.channel==="sms");assert.equal(sms.status,"draft");assert.equal(sms.sent_at,null);assert.equal(sms.delivered_at,null);assert.match(sms.error_message,/not configured/);
 const inbox=await(await fetch(`http://127.0.0.1:54334/api/v1/search?query=${encodeURIComponent(`to:${f.email}`)}`)).json();assert.equal(inbox.messages.length,2);
 for(const message of inbox.messages){assert.match(message.Subject,/LOCAL TEST/);const captured=await(await fetch(`http://127.0.0.1:54334/api/v1/message/${message.ID}`)).json();const token=captured.Text.match(/\/documents\/([a-f0-9]{64})/)[1];const d=documentSchema.parse(ok(await client().rpc("read_customer_document",{p_token:token})));assert.ok(["repair_report","service_reminder"].includes(d.kind));assert.ok(!captured.Text.includes("INTERNAL_PHASE8_MARKER"));assert.equal((await fetch(`${app}/documents/${token}`)).status,200);}
 const diagnosis=ok(await f.client.from("diagnoses").select("id,ai_summary").eq("work_order_id",f.jobId).single());assert.ok(diagnosis.ai_summary.length>20);
 if(!f.diagnosisLink)f.diagnosisLink=await rpc(f,"create_document_link",{p_kind:"diagnosis",p_id:diagnosis.id});
 const diagnosisDoc=documentSchema.parse(ok(await client().rpc("read_customer_document",{p_token:f.diagnosisLink.token})));assert.equal(diagnosisDoc.kind,"diagnosis");assert.equal((await fetch(`${app}/documents/${f.diagnosisLink.token}`)).status,200);
 await f.client.auth.signOut({scope:"local"});delete f.client;writeFileSync(fixtureFile,JSON.stringify(f,null,2));
 console.log("PASS: persisted report, paid invoice and two immutable receipts; real report and reminder Mailpit emails with working links; SMS remains unsent draft; saved AI diagnosis share; snapshot equality across repeated checks/restart.");
}else if(process.argv.includes("--cleanup-browser-fixture")){
 const f=JSON.parse(readFileSync(fixtureFile,"utf8"));assert.match(f.email,/^phase8-[0-9a-f-]+@example\.test$/);await removeMail(f);await cleanup(f);unlinkSync(fixtureFile);console.log("PASS: exact Phase 8 browser fixtures and local Mailpit messages removed.");
}else if(process.argv.includes("--create-browser-fixture")){
 assert.equal(existsSync(fixtureFile),false);try{const f=await completedFixture("browser verification");const stored=Object.fromEntries(Object.entries(f).filter(([key])=>key!=="client"));writeFileSync(fixtureFile,JSON.stringify(stored,null,2));console.log(JSON.stringify(stored,null,2));}catch(error){for(const f of fixtures.reverse())await cleanup(f);throw error;}
}else{
 try{
  const a=await completedFixture("API A");const b=await completedFixture("API B");const anon=client();
  const reports=await Promise.all([doc(a,"repair_report",a.jobId,"create"),doc(a,"repair_report",a.jobId,"create")]);assert.equal(reports[0].id,reports[1].id);
  const report=reports[0];await doc(a,"repair_report",report.id,"finalize");
  const drafts=await Promise.all([doc(a,"invoice",a.jobId,"create"),doc(a,"invoice",a.jobId,"create")]);assert.equal(drafts[0].id,drafts[1].id);
  const invoice=drafts[0];await doc(a,"invoice",invoice.id,"issue");const payment={amount:"100.00",method:"cash",request_key:randomUUID()};
  const receipts=await Promise.all([doc(a,"invoice",invoice.id,"payment",payment),doc(a,"invoice",invoice.id,"payment",payment)]);assert.equal(receipts[0].receipt_id,receipts[1].receipt_id);
  assert.equal(ok(await a.client.from("work_order_invoices").select("balance_due").eq("id",invoice.id).single()).balance_due,176.1);
  const racing=await Promise.all([a.client.rpc("manage_document",{p_kind:"invoice",p_id:invoice.id,p_action:"payment",p_data:{amount:"176.10",method:"card",request_key:randomUUID()}}),a.client.rpc("manage_document",{p_kind:"invoice",p_id:invoice.id,p_action:"payment",p_data:{amount:"176.10",method:"cash",request_key:randomUUID()}})]);assert.equal(racing.filter(r=>!r.error).length,1,"only one concurrent final payment succeeds");
  const paid=ok(await a.client.from("work_order_invoices").select("status,total,amount_paid,balance_due").eq("id",invoice.id).single());assert.deepEqual(paid,{status:"paid",total:276.1,amount_paid:276.1,balance_due:0});
  for(const table of ["repair_reports","work_order_invoices","work_order_payments","work_order_receipts","customer_document_links","customer_communications"]){assert.deepEqual(ok(await b.client.from(table).select("id").eq("shop_id",a.shopId)),[]);assert.ok((await anon.from(table).select("id")).error);}
  const futureAppointment=ok(await a.client.from("appointments").insert({shop_id:a.shopId,customer_id:a.customerId,vehicle_id:a.vehicleId,scheduled_start:"2027-01-15T14:00:00Z",status:"requested"}).select("id").single());
  const sources=[["appointment_reminder",futureAppointment.id],["repair_report",report.id],["invoice",invoice.id],["receipt",receipts[0].receipt_id],["inspection",a.inspectionId],["pre_inspection",a.preInspectionId],["estimate",a.estimateId],["recommendation",a.recommendationId],["service_reminder",a.recommendationId]];
  for(const [kind,id] of sources){const link=await rpc(a,"create_document_link",{p_kind:kind,p_id:id});const snapshot=ok(await anon.rpc("read_customer_document",{p_token:link.token}));assert.equal(snapshot.kind,kind);for(const secret of ["unit_cost","13.37","INTERNAL_PHASE8_MARKER",a.shopId,a.customerId,a.jobId])assert.ok(!JSON.stringify(snapshot).includes(secret),`${kind} leaked ${secret}`);
   const parsed=documentSchema.safeParse(snapshot);assert.ok(parsed.success,`${kind}: ${JSON.stringify(parsed.error?.issues)}`);
   const page=await fetch(`${app}/documents/${link.token}?documentId=${b.jobId}&type=invoice`);assert.equal(page.status,200,`${kind} public page`);assert.match(page.headers.get("cache-control"),/no-store/);assert.equal(page.headers.get("referrer-policy"),"no-referrer");const html=await page.text();assert.ok(html.includes(snapshot.title));assert.ok(!html.includes("INTERNAL_PHASE8_MARKER"));assert.ok(!html.includes('href="/customers"'));
   await rpc(a,"revoke_document_link",{p_id:link.id});assert.equal(ok(await anon.rpc("read_customer_document",{p_token:link.token})),null);
  }
  assert.equal((await fetch(`${app}/documents/${"0".repeat(64)}`)).status,404);
  const approvalJob={...a,jobId:ok(await a.client.from("work_orders").insert({shop_id:a.shopId,customer_id:a.customerId,vehicle_id:a.vehicleId,status:"open"}).select("id").single()).id};
  await manage(approvalJob,"service",{description:"Temporary approval message repair",labor_hours:"1",labor_rate:"10",request_key:randomUUID()});
  const approvalEstimate=await manage(approvalJob,"draft");const previousApproval=await manage(approvalJob,"present");
  const approvalMessage=await rpc(a,"prepare_communication",{p_kind:"approval_request",p_id:approvalEstimate.id,p_channel:"sms",p_recipient:"+15555550123",p_message:"Please review this estimate",p_request:randomUUID()});
  assert.equal(approvalMessage.path,`/approve/${approvalMessage.token}`);assert.equal(ok(await anon.rpc("read_customer_approval",{p_token:previousApproval.token})),null);
  assert.ok(ok(await anon.rpc("read_customer_approval",{p_token:approvalMessage.token})));assert.equal((await rpc(a,"claim_communication",{p_id:approvalMessage.id,p_token:approvalMessage.token})).unconfigured,true);
  const sms=await rpc(a,"prepare_communication",{p_kind:"service_reminder",p_id:a.recommendationId,p_channel:"sms",p_recipient:"+15555550123",p_message:"Temporary reminder",p_request:randomUUID()});assert.equal((await rpc(a,"claim_communication",{p_id:sms.id,p_token:sms.token})).unconfigured,true);const communication=ok(await a.client.from("customer_communications").select("status,sent_at,delivered_at,error_message").eq("id",sms.id).single());assert.equal(communication.status,"draft");assert.equal(communication.sent_at,null);assert.equal(communication.delivered_at,null);assert.match(communication.error_message,/not configured/);
  console.log("PASS: report/invoice idempotency, concurrent payment/replay protection, exact balances, immutable receipts, all shareable document types, public HTML isolation and headers, token revocation, cross-shop and anonymous denial, manual reminder/SMS truthful draft, approval/repair and completed inspection regression.");
 }finally{for(const f of fixtures.reverse())await cleanup(f);}
}
