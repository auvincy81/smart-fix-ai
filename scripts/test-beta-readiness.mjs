import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";

// Local only: node --env-file=.env.local scripts/test-beta-readiness.mjs <mode>
// See docs/phase-9-beta-readiness.md for browser fixture setup and cleanup.
// Start the application on port 3100 first. No service-role key is used.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "http://127.0.0.1:54331", "Refusing any other Supabase target");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const app = "http://127.0.0.1:3100";
const fixtureFile = "supabase/.temp/phase9-browser.json";
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const ok = ({ data, error }) => { assert.equal(error, null, error?.message); return data; };
const uuid = (id) => { assert.match(id, /^[0-9a-f-]{36}$/); return id; };
const sql = (q) => execFileSync("docker", ["exec", "supabase_db_mekareports", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1", "-c", q], { encoding: "utf8" }).trim();
async function cleanup(f) {
  const userId = uuid(f.userId);
  if (f.shopId) {
    const shop = uuid(f.shopId);
    assert.equal(sql(`select count(*) from shops where id='${shop}' and name like 'Temporary Phase 9%'`), "1");
    const db = f.client ?? client();
    if (!f.client) ok(await db.auth.signInWithPassword({ email: f.email, password: f.password }));
    const photos = ok(await db.from("inspection_photos").select("storage_path").eq("shop_id", shop));
    sql(`delete from inspection_photos where shop_id='${shop}'`);
    if (photos.length) ok(await db.storage.from("inspection-photos").remove(photos.map((p) => p.storage_path)));
    ok(await db.auth.signOut());
    sql(`begin; delete from beta_feedback where shop_id='${shop}'; delete from customer_communications where shop_id='${shop}'; delete from customer_document_links where shop_id='${shop}'; delete from work_order_receipts where shop_id='${shop}'; delete from work_order_payments where shop_id='${shop}'; delete from work_order_invoices where shop_id='${shop}'; delete from repair_reports where shop_id='${shop}'; delete from customer_approval_audits where shop_id='${shop}'; delete from customer_approval_requests where shop_id='${shop}'; delete from work_order_estimate_items where shop_id='${shop}'; delete from work_order_estimates where shop_id='${shop}'; delete from work_order_parts where shop_id='${shop}'; delete from work_order_services where shop_id='${shop}'; delete from service_recommendations where shop_id='${shop}'; delete from diagnoses where shop_id='${shop}'; delete from inspections where shop_id='${shop}'; delete from work_orders where shop_id='${shop}'; delete from appointments where shop_id='${shop}'; delete from vehicles where shop_id='${shop}'; delete from customers where shop_id='${shop}'; delete from auth.users where id='${userId}'; delete from shops where id='${shop}'; commit;`);
  } else sql(`delete from auth.users where id='${userId}'`);
}

const args = process.argv.slice(2);
if(args.includes("--prepare")) {
 assert.equal(existsSync(fixtureFile),false);
 const f={email:`phase9-${randomUUID()}@example.test`,password:`Phase9-Test!${randomUUID()}`,roles:[]};
 writeFileSync(fixtureFile,JSON.stringify(f,null,2)); console.log(JSON.stringify(f));
} else {
 const f=JSON.parse(readFileSync(fixtureFile,"utf8"));
 assert.match(f.email,/^phase9-[0-9a-f-]+@example\.test$/);
 const db=client(); const auth=ok(await db.auth.signInWithPassword({email:f.email,password:f.password}));
 f.userId=auth.user.id;
 const member=ok(await db.from("shop_members").select("id,shop_id").single()); f.memberId=member.id; f.shopId=member.shop_id;
 if(args.includes("--attach-roles")) {
  for(const role of ["manager","service_advisor","technician"]) {
   const r={role,email:`phase9-${role}-${randomUUID()}@example.test`,password:`Phase9-Test!${randomUUID()}`};
   const c=client();r.userId=ok(await c.auth.signUp({email:r.email,password:r.password})).user.id;r.memberId=randomUUID();
   sql(`insert into shop_members(id,shop_id,user_id,role) values ('${uuid(r.memberId)}','${uuid(f.shopId)}','${uuid(r.userId)}','${role}')`);
   await c.auth.signOut({scope:"local"});f.roles.push(r);
  }
  writeFileSync(fixtureFile,JSON.stringify(f,null,2)); console.log(JSON.stringify(f));
 } else if(args.includes("--cleanup")) {
  const inbox=await(await fetch(`http://127.0.0.1:54334/api/v1/search?query=${encodeURIComponent(`to:${f.email}`)}`)).json();
  const ids=(inbox.messages||[]).map(m=>m.ID);if(ids.length)assert.equal((await fetch("http://127.0.0.1:54334/api/v1/messages",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({IDs:ids})})).status,200);
  for(const r of f.roles)sql(`delete from auth.users where id='${uuid(r.userId)}'`);
  await cleanup({...f,client:db});unlinkSync(fixtureFile);console.log("PASS: exact Phase 9 fixtures, photos, feedback and captured messages removed.");
 } else if(args.includes("--audit")) {
  const cookies=[]; const ssr=createServerClient(url,key,{cookies:{getAll:()=>cookies,setAll:values=>{for(const v of values){const i=cookies.findIndex(c=>c.name===v.name);if(i<0)cookies.push(v);else cookies[i]=v;}}}});
  ok(await ssr.auth.signInWithPassword({email:f.email,password:f.password}));const cookie=cookies.map(c=>`${c.name}=${c.value}`).join("; ");
  const request=(path,body,base=app)=>fetch(base+path,{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify(body)});
  assert.equal((await fetch(app+"/api/diagnose",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({symptoms:"test"})})).status,401);
  assert.equal((await request("/api/diagnose",{dashboardPhoto:{type:"image/jpeg",data:Buffer.from("forged image").toString("base64")}})).status,400);
  assert.equal((await request("/api/diagnose",{})).status,400);
  assert.equal((await request("/api/vehicles/decode-vin",{vin:"INVALID"})).status,400);
  assert.equal((await fetch(app+"/customers",{redirect:"manual"})).status,307);
  assert.equal((await fetch(app+"/login",{headers:{cookie},redirect:"manual"})).status,307);
  assert.equal((await fetch(app+"/approve/"+"0".repeat(64))).status,404);
  assert.equal((await fetch(app+"/documents/"+"0".repeat(64))).status,404);
  const message={id:randomUUID(),shop_id:f.shopId,user_id:f.userId,path:"/work-orders",category:"bug",message:"Temporary feedback permission check"};
  ok(await db.from("beta_feedback").insert(message));assert.equal((await db.from("beta_feedback").insert(message)).error.code,"23505");
  for(const r of f.roles) {
   const c=client();ok(await c.auth.signInWithPassword({email:r.email,password:r.password}));
   ok(await c.from("beta_feedback").insert({...message,id:randomUUID(),user_id:r.userId}));
   assert.ok((await c.from("beta_feedback").insert({...message,id:randomUUID()})).error,"cannot spoof feedback author");
   const rows=ok(await c.from("beta_feedback").select("id").eq("id",message.id));assert.equal(rows.length,r.role==="technician"?0:1);
   const update=ok(await c.from("beta_feedback").update({status:"reviewed"}).eq("id",message.id).select("id"));assert.equal(update.length,r.role==="technician"?0:1);
   assert.ok((await c.from("beta_feedback").update({message:"Tampered message"}).eq("id",message.id)).error);
   if(r.role==="technician") {
    assert.ok((await c.from("customers").insert({shop_id:f.shopId,first_name:"Unauthorized",last_name:"Fixture"})).error);
    if(f.jobId)assert.ok((await c.rpc("manage_repair",{p_job:f.jobId,p_action:"draft",p_data:{}})).error);
   }
   await c.auth.signOut({scope:"local"});
  }
  const refresh=ok(await ssr.auth.refreshSession());assert.ok(refresh.session);assert.equal(ok(await ssr.auth.getUser()).user.id,f.userId);
  const anonymous=client();assert.ok((await anonymous.from("beta_feedback").select("id")).error);
  const svg=(part)=>`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${part?'#ddd':'#151515'}"/><text x="40" y="60" fill="${part?'#111':'#fff'}" font-size="30">Synthetic automotive test image</text>${part?'<path d="M370 130h60v150h25v110h-110V280h25Z" fill="white" stroke="#333" stroke-width="8"/><path d="M350 315h100M350 335h100M350 355h100M385 400v70h45v-30" stroke="#555" stroke-width="12" fill="none"/><text x="180" y="520" font-size="30">Spark plug illustration</text>':'<path d="M230 250h100v-45h75v45h75l60 60v100H250v-50h-50v-60h30Z" fill="none" stroke="#ffae00" stroke-width="18"/><text x="270" y="470" fill="#ffae00" font-size="38">CHECK ENGINE</text>'}</svg>`;
  for(const [name,part] of [["dashboardPhoto",false],["partPhoto",true]]) {
   const bytes=await sharp(Buffer.from(svg(part))).png().toBuffer();
   const response=await request("/api/diagnose",{vehicle:"2003 Honda Accord",symptoms:"Warm rough idle",codes:"P0301",context:"Temporary test fixture. Interpret the supplied illustration only, not a real inspected vehicle.",[name]:{type:"image/png",data:bytes.toString("base64")}});
   const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.ok(JSON.stringify(result).length>200);console.log(`PASS: real AI response using ${name} synthetic illustration`);
  }
  await ssr.auth.signOut({scope:"local"});console.log("PASS: role feedback policy, duplicate key, author spoof rejection, unauthorized customer/estimate actions, auth refresh, protected redirects, bad image/VIN/form/tokens and both AI image inputs.");
 } else if(args.includes("--appointment-fixtures")) {
  assert.ok(!f.extraAppointments, "Appointment UI fixtures already exist");
  f.extraAppointments=[];
  for(const outcome of ["cancelled","no_show"]) {
   const record=ok(await db.from("appointments").insert({id:randomUUID(),shop_id:f.shopId,customer_id:f.customerId,vehicle_id:f.vehicleId,scheduled_start:"2026-09-24T14:00:00Z",status:"confirmed",customer_concern:`Temporary Phase 9 ${outcome} UI fixture`}).select("id").single());
   f.extraAppointments.push({...record,outcome});
  }
  writeFileSync(fixtureFile,JSON.stringify(f,null,2));console.log(JSON.stringify(f.extraAppointments));
 } else if(args.includes("--real-photos")) {
  // Optional, manually sourced test photos; never committed. See the Phase 9 report for credits.
  const cookies=[];const ssr=createServerClient(url,key,{cookies:{getAll:()=>cookies,setAll:v=>cookies.push(...v)}});
  ok(await ssr.auth.signInWithPassword({email:f.email,password:f.password}));const cookie=cookies.map(c=>`${c.name}=${c.value}`).join("; ");
  try {
   for(const [field,file] of [["dashboardPhoto","phase9-dashboard.jpg"],["partPhoto","phase9-part.jpeg"]]) {
    const bytes=readFileSync(`supabase/.temp/${file}`);
    const response=await fetch(app+"/api/diagnose",{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({context:"Temporary beta test: interpret only the supplied automotive photograph. No physical vehicle inspection has been performed.",[field]:{type:"image/jpeg",data:bytes.toString("base64")}}),signal:AbortSignal.timeout(150000)});
    const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
    if(field==="partPhoto")assert.match(result.part_analysis.part_name,/spark\s*plug/i);
    else assert.match(result.dashboard_analysis.detected_warning,/engine|oil|battery|brake|airbag/i);
    console.log(`PASS: actual photograph in ${field}: ${field==="partPhoto"?result.part_analysis.part_name:result.dashboard_analysis.detected_warning}`);
   }
  } finally {await ssr.auth.signOut({scope:"local"});}
 } else if(args.includes("--verify")) {
  for(const appointment of f.extraAppointments||[])assert.equal(ok(await db.from("appointments").select("status").eq("id",appointment.id).single()).status,appointment.outcome);
  if(f.extraAppointments?.length)assert.equal(ok(await db.from("appointments").select("customer_concern").eq("id",f.extraAppointments[0].id).single()).customer_concern,"Temporary Phase 9 edited cancellation fixture");
  const job=ok(await db.from("work_orders").select("status,mileage_out").eq("id",f.jobId).single());assert.deepEqual(job,{status:"completed",mileage_out:125010});assert.equal(ok(await db.from("vehicles").select("mileage").eq("id",f.vehicleId).single()).mileage,125010);assert.equal(ok(await db.from("appointments").select("status").eq("id",f.appointmentId).single()).status,"completed");
  assert.equal(ok(await db.from("diagnoses").select("id").eq("work_order_id",f.jobId)).length,1);
  const inspections=ok(await db.from("inspections").select("inspection_type,status").eq("work_order_id",f.jobId));assert.equal(inspections.length,2);assert.ok(inspections.every(i=>i.status==="completed"));
  const invoices=ok(await db.from("work_order_invoices").select("status,total,amount_paid,balance_due").eq("work_order_id",f.jobId));assert.deepEqual(invoices,[{status:"paid",total:150,amount_paid:150,balance_due:0}]);
  const receipts=ok(await db.from("work_order_receipts").select("snapshot").eq("work_order_id",f.jobId).order("receipt_number"));assert.equal(receipts.length,2);assert.ok(JSON.stringify(receipts[0]).includes('100.00'));
  const report=ok(await db.from("repair_reports").select("report_status,report_snapshot").eq("work_order_id",f.jobId).single());assert.equal(report.report_status,"final");assert.ok(!JSON.stringify(report.report_snapshot).includes("INTERNAL_PHASE9_MARKER"));assert.ok(!JSON.stringify(report.report_snapshot).includes("13.37"));
  const comms=ok(await db.from("customer_communications").select("type,channel,status,sent_at,delivered_at,error_message,provider").eq("shop_id",f.shopId));
  for(const type of ["approval_request","repair_report","invoice","receipt","service_reminder"])assert.ok(comms.some(c=>c.type===type&&c.channel==="email"&&c.status==="sent"&&c.provider==="local_mailpit"&&c.sent_at&&!c.delivered_at),type+" captured locally");
  assert.ok(comms.some(c=>c.channel==="sms"&&c.status==="draft"&&!c.sent_at&&!c.delivered_at&&c.error_message.includes("not configured")));assert.ok(comms.some(c=>c.channel==="email"&&c.status==="failed"&&!c.sent_at&&!c.delivered_at));
  const inbox=await(await fetch(`http://127.0.0.1:54334/api/v1/search?query=${encodeURIComponent(`to:${f.email}`)}`)).json();assert.equal(inbox.messages.length,5);
  for(const m of inbox.messages){assert.match(m.Subject,/LOCAL TEST/);const full=await(await fetch(`http://127.0.0.1:54334/api/v1/message/${m.ID}`)).json();const path=full.Text.match(/\/(?:documents|approve)\/[a-f0-9]{64}/)?.[0];assert.ok(path);const html=await(await fetch(app+path)).text();assert.ok(!html.includes("INTERNAL_PHASE9_MARKER"));assert.ok(!html.includes("13.37"));}
  const persistent={job,invoices,receipts,report};if(f.verified)assert.deepEqual(persistent,f.verified);f.verified=persistent;writeFileSync(fixtureFile,JSON.stringify(f,null,2));console.log("PASS: full golden workflow, technician completion, $150 invoice paid $50/$100 with two receipts, report privacy, five actual Mailpit messages/links, failed email and truthful draft SMS; persisted snapshots match on reruns.");
 } else if(args.includes("--auth-faults")) {
  const cookies=[];const ssr=createServerClient(url,key,{cookies:{getAll:()=>cookies,setAll:v=>cookies.push(...v)}});const session=ok(await ssr.auth.signInWithPassword({email:f.email,password:f.password})).session;
  const cookie=cookies.map(c=>`${c.name}=${c.value}`).join("; ");
  const bad={...session,expires_at:1,expires_in:0,refresh_token:"phase9-expired-invalid-refresh"};
  const pieces=bad.access_token.split(".");const payload=JSON.parse(Buffer.from(pieces[1],"base64url").toString("utf8"));payload.exp=1;pieces[1]=Buffer.from(JSON.stringify(payload)).toString("base64url");bad.access_token=pieces.join(".");
  const name=cookies.find(c=>c.name.includes("auth-token")).name.replace(/\.\d+$/,"");
  const expired=await fetch(app+"/customers",{headers:{cookie:`${name}=base64-${Buffer.from(JSON.stringify(bad)).toString("base64url")}`},redirect:"manual"});assert.equal(expired.status,307);assert.equal(expired.headers.get("location"),"/login");
  const temporaryCookies=[];const temporaryClient=createServerClient(url,key,{cookies:{getAll:()=>temporaryCookies,setAll:v=>temporaryCookies.push(...v)}});const temporary=ok(await temporaryClient.auth.signUp({email:`phase9-no-shop-${randomUUID()}@example.test`,password:`Phase9-Test!${randomUUID()}`}));
  try{const noShopCookie=temporaryCookies.map(c=>`${c.name}=${c.value}`).join("; ");for(const path of ["/","/customers"]){const result=await fetch(app+path,{headers:{cookie:noShopCookie},redirect:"manual"});assert.equal(result.status,307);assert.equal(result.headers.get("location"),"/onboarding");}assert.equal((await fetch(app+"/onboarding",{headers:{cookie:noShopCookie},redirect:"manual"})).status,200);}finally{await temporaryClient.auth.signOut({scope:"local"});sql(`delete from auth.users where id='${uuid(temporary.user.id)}'`);}
  // Stop only the stateless API container briefly; preserve database/auth/storage.
  try {
   execFileSync("docker",["stop","--time","1","supabase_rest_mekareports"],{stdio:"pipe"});
   const unavailable=await fetch(app+"/customers",{headers:{cookie},redirect:"manual",signal:AbortSignal.timeout(20000)});assert.notEqual(unavailable.status,307);const body=await unavailable.text();assert.ok(!body.includes("INTERNAL_PHASE9_MARKER"));assert.ok(!/password authentication failed|postgresql:\/\//i.test(body));
  } finally {execFileSync("docker",["start","supabase_rest_mekareports"],{stdio:"pipe"});}
  await ssr.auth.signOut({scope:"local"});console.log("PASS: expired/tampered session redirects to login, no-shop routes reach onboarding without a loop, unavailable local REST does not redirect valid users to login or disclose database details; API restored.");
 } else if(args.includes("--pre-inspection")) {
  const id=ok(await db.rpc("create_inspection",{p_work_order:f.jobId,p_type:"pre_inspection",p_state:"NY",p_request_key:randomUUID(),p_technician:f.memberId}));
  const items=ok(await db.from("inspection_items").select("*").eq("inspection_id",id)).map(i=>({...i,condition:"good",technician_note:"INTERNAL_PHASE9_MARKER"}));
  const first=ok(await db.from("inspections").select("updated_at").eq("id",id).single());
  items[0].condition="urgent";items[1].condition="not_checked";
  ok(await db.rpc("save_inspection",{p_id:id,p_updated_at:first.updated_at,p_items:items,p_summary:"Temporary readiness blocker fixture",p_complete:false,p_acknowledge_unchecked:false}));
  const second=ok(await db.from("inspections").select("*").eq("id",id).single());assert.notEqual(second.readiness_status,"likely_ready");
  items[0].condition="good";items[1].condition="good";
  ok(await db.rpc("save_inspection",{p_id:id,p_updated_at:second.updated_at,p_items:items,p_summary:"Temporary completed generic readiness fixture",p_complete:true,p_acknowledge_unchecked:false}));
  f.preInspectionId=id;writeFileSync(fixtureFile,JSON.stringify(f,null,2));console.log("PASS: pre-inspection unfinished/urgent findings saved; all-good completion persisted. "+id);
 } else if(args.includes("--photos")) {
  const cookies=[];const ssr=createServerClient(url,key,{cookies:{getAll:()=>cookies,setAll:v=>cookies.push(...v)}});ok(await ssr.auth.signInWithPassword({email:f.email,password:f.password}));const cookie=cookies.map(c=>`${c.name}=${c.value}`).join("; ");
  const inspection=ok(await db.from("inspections").select("id").eq("shop_id",f.shopId).eq("inspection_type","multipoint").single());
  const png=await sharp({create:{width:400,height:300,channels:3,background:"#64748b"}}).png().toBuffer();const requestKey=randomUUID();
  const upload=(bytes)=>{const body=new FormData();body.set("photo",new File([bytes],"phase9-test.png",{type:"image/png"}));body.set("caption","Synthetic neutral beta-test fixture, not an actual vehicle finding");body.set("requestKey",requestKey);return fetch(`${app}/api/inspections/${inspection.id}/photos`,{method:"POST",headers:{cookie},body});};
  assert.equal((await upload(Buffer.from("bad bytes"))).status,400);
  const response=await upload(png);assert.equal(response.status,201,await response.text());const repeat=await upload(png);assert.equal(repeat.status,201);assert.equal((await repeat.json()).id,requestKey);
  assert.equal(ok(await db.from("inspection_photos").select("id").eq("id",requestKey)).length,1);
  await ssr.auth.signOut({scope:"local"});console.log("PASS: actual photo route rejects forged bytes, stores private normalized image and replays upload key without duplicate.");
 } else if(args.includes("--faults")) {
  const cookies=[];const ssr=createServerClient(url,key,{cookies:{getAll:()=>cookies,setAll:v=>cookies.push(...v)}});
  ok(await ssr.auth.signInWithPassword({email:f.email,password:f.password}));const cookie=cookies.map(c=>`${c.name}=${c.value}`).join("; ");
  const failed=await fetch("http://127.0.0.1:3101/api/diagnose",{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({symptoms:"Temporary provider failure check"})});
  assert.equal(failed.status,503);const body=await failed.text();assert.match(body,/Diagnosis could not be completed/);assert.ok(!/phase9-invalid|api.key|stack|OpenAI|Incorrect API/i.test(body));
  const invalid=await fetch(app+"/api/vehicles/decode-vin",{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({vin:"AAAAAAAAAAAAAAAAA"})});assert.equal(invalid.status,422);assert.match(await invalid.text(),/manually/);
  const noShop=client();const temporary=ok(await noShop.auth.signUp({email:`phase9-no-shop-${randomUUID()}@example.test`,password:`Phase9-Test!${randomUUID()}`}));
  try {
   assert.ok((await noShop.from("beta_feedback").insert({shop_id:f.shopId,user_id:temporary.user.id,path:"/",category:"bug",message:"No membership injection"})).error);
   assert.throws(()=>sql(`insert into shop_members(shop_id,user_id,role) values('${randomUUID()}','${uuid(temporary.user.id)}','owner')`));
  } finally {await noShop.auth.signOut({scope:"local"});sql(`delete from auth.users where id='${uuid(temporary.user.id)}'`);}
  await ssr.auth.signOut({scope:"local"});console.log("PASS: actual AI provider rejection stays generic, no-result VIN permits manual entry, invalid membership rejected by FK, no-shop feedback denied.");
 } else if(args.includes("--record-ids")) {
  for(const [table,keyName] of [["customers","customerId"],["vehicles","vehicleId"],["appointments","appointmentId"],["work_orders","jobId"]]) {const records=ok(await db.from(table).select("id").eq("shop_id",f.shopId));if(records.length)f[keyName]=records[0].id;}
  writeFileSync(fixtureFile,JSON.stringify(f,null,2));console.log(JSON.stringify(f));
 }
 await db.auth.signOut({scope:"local"});
}
