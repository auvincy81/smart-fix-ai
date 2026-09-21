import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

// Deliberately fixed to the dedicated LOCAL container; no URL or remote option.
const args = ["exec", "supabase_db_mekareports", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1", "-c"];
const sql = (query) => execFileSync("docker", [...args, query], { encoding: "utf8" }).trim();
const asyncSql = async (query) => (await promisify(execFile)("docker", [...args, query], { encoding: "utf8" })).stdout.trim();
const userId = randomUUID(), customerId = randomUUID(), vehicleId = randomUUID();
let shopId;
const asUser = (query) => `begin; set local role authenticated; set local request.jwt.claim.sub='${userId}'; ${query}; commit;`;
try {
  shopId = sql(`begin; insert into auth.users(id) values ('${userId}'); set local role authenticated; set local request.jwt.claim.sub='${userId}'; select public.create_initial_shop('Temporary Phase 5 concurrency test'); commit;`);
  assert.match(shopId, /^[0-9a-f-]{36}$/);
  sql(`insert into customers(id,shop_id,first_name,last_name) values ('${customerId}','${shopId}','Concurrency','Fixture'); insert into vehicles(id,shop_id,customer_id) values ('${vehicleId}','${shopId}','${customerId}');`);
  sql(asUser(`insert into appointments(shop_id,customer_id,vehicle_id,scheduled_start,status) values ('${shopId}','${customerId}','${vehicleId}',now(),'confirmed')`));
  // Keep the generated appointment ID without permitting client-supplied IDs.
  const actualAppointment = sql(`select id from appointments where shop_id='${shopId}'`);
  assert.match(actualAppointment, /^[0-9a-f-]{36}$/);
  const insert = (linked = false) => asUser(`insert into work_orders(shop_id,customer_id,vehicle_id,status${linked ? ",appointment_id" : ""}) values ('${shopId}','${customerId}','${vehicleId}','open'${linked ? `,'${actualAppointment}'` : ""}) returning work_order_number`);
  const numbers = await Promise.all(Array.from({ length: 8 }, () => asyncSql(insert())));
  assert.equal(new Set(numbers).size, 8);
  numbers.forEach((number) => assert.match(number, /^WO-\d{4}-\d{6,}$/));
  const duplicate = await Promise.allSettled([asyncSql(insert(true)), asyncSql(insert(true))]);
  assert.equal(duplicate.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = duplicate.find((r) => r.status === "rejected");
  assert.match(rejected.reason.stderr, /already has a work order|duplicate key/);
  assert.equal(sql(`select count(*) from work_orders where appointment_id='${actualAppointment}'`), "1");
  assert.equal(sql(`select status from appointments where id='${actualAppointment}'`), "in_service");
  assert.equal(sql(`select count(*) from work_orders where shop_id='${shopId}'`), "9");
  console.log("PASS: 8 concurrent unique numbers; 2 simultaneous appointment requests produce exactly 1 job; appointment sync is atomic.");
} finally {
  // Only random IDs created by this run; no other Auth/shop/customer records.
  if (shopId && /^[0-9a-f-]{36}$/.test(shopId)) sql(`begin; delete from work_orders where shop_id='${shopId}'; delete from appointments where shop_id='${shopId}'; delete from vehicles where id='${vehicleId}' and shop_id='${shopId}'; delete from customers where id='${customerId}' and shop_id='${shopId}'; delete from auth.users where id='${userId}'; delete from shops where id='${shopId}'; commit;`);
  else sql(`delete from auth.users where id='${userId}'`);
}
