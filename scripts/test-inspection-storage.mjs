import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { normalizeInspectionPhoto, photoLimit, limitedPhotoForm } from "../lib/inspections/images.ts";

// Run with: node --env-file=.env.local --experimental-strip-types scripts/test-inspection-storage.mjs
// Fixed local target. No service-role key or browser session is used.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, "http://127.0.0.1:54331", "Refusing to test any other Supabase target");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const sql = (query) => execFileSync("docker", ["exec", "supabase_db_mekareports", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1", "-c", query], { encoding: "utf8" }).trim();
const ok = ({ data, error }) => { assert.equal(error, null, error?.message); return data; };
const fixtures = [];
try {
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#64748b" } }).png().toBuffer();
  const normalized = await normalizeInspectionPhoto(new File([png], "misleading.txt", { type: "text/plain" }));
  assert.equal((await sharp(normalized).metadata()).format, "jpeg", "actual bytes determine supported image type");
  await assert.rejects(normalizeInspectionPhoto(new File(["not an image"], "forged.jpg", { type: "image/jpeg" })));
  await assert.rejects(normalizeInspectionPhoto(new File([new Uint8Array(photoLimit + 1)], "large.jpg", { type: "image/jpeg" })));
  await assert.rejects(normalizeInspectionPhoto(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'], "vector.jpg", { type: "image/jpeg" })));
  await assert.rejects(limitedPhotoForm(new Request("http://localhost/test", { method: "POST", body: new Uint8Array(photoLimit + 300000) })));
  for (let n = 0; n < 2; n++) {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = ok(await client.auth.signUp({ email: `phase6-storage-${randomUUID()}@example.test`, password: `LocalTest!${randomUUID()}` }));
    assert.ok(auth.session, "Local email confirmation must be disabled for this fixture");
    const f = { client, userId: auth.user.id, shopId: null, path: null };
    fixtures.push(f);
    f.shopId = ok(await client.rpc("create_initial_shop", { p_name: `Temporary Phase 6 storage ${n}` }));
    const customer = ok(await client.from("customers").insert({ shop_id: f.shopId, first_name: "Storage", last_name: "Fixture" }).select("id").single());
    const vehicle = ok(await client.from("vehicles").insert({ shop_id: f.shopId, customer_id: customer.id }).select("id").single());
    const job = ok(await client.from("work_orders").insert({ shop_id: f.shopId, customer_id: customer.id, vehicle_id: vehicle.id, status: "open" }).select("id").single());
    const member = ok(await client.from("shop_members").select("id").single());
    const creation = { p_work_order: job.id, p_type: "multipoint", p_state: "", p_request_key: randomUUID(), p_technician: member.id };
    const concurrent = await Promise.all([client.rpc("create_inspection", creation), client.rpc("create_inspection", creation)]);
    f.inspectionId = ok(concurrent[0]);
    assert.equal(ok(concurrent[1]), f.inspectionId, "simultaneous retries return the same inspection");
    assert.equal(ok(await client.from("inspections").select("id")).length, 1);
  }
  const [a, b] = fixtures;
  const photoId = randomUUID();
  a.path = `${a.shopId}/${a.inspectionId}/${photoId}.jpg`;
  const bucket = a.client.storage.from("inspection-photos");
  ok(await bucket.upload(a.path, normalized, { contentType: "image/jpeg", upsert: false }));
  ok(await a.client.from("inspection_photos").insert({ id: photoId, shop_id: a.shopId, inspection_id: a.inspectionId, storage_path: a.path, caption: "Neutral storage test image, not a vehicle finding" }));
  const downloaded = ok(await bucket.download(a.path));
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), normalized);
  const signed = ok(await bucket.createSignedUrl(a.path, 60));
  assert.equal((await fetch(signed.signedUrl)).status, 200);
  assert.ok((await b.client.storage.from("inspection-photos").download(a.path)).error);
  assert.ok((await b.client.storage.from("inspection-photos").createSignedUrl(a.path, 60)).error);
  assert.ok((await b.client.storage.from("inspection-photos").upload(`${a.shopId}/${a.inspectionId}/${randomUUID()}.jpg`, normalized, { contentType: "image/jpeg" })).error);
  assert.deepEqual(ok(await b.client.from("inspection_photos").select("id").eq("id", photoId)), []);
  const anon = createClient(url, key, { auth: { persistSession: false } });
  assert.ok((await anon.storage.from("inspection-photos").download(a.path)).error);
  assert.notEqual((await fetch(`${url}/storage/v1/object/public/inspection-photos/${a.path}`)).status, 200);
  assert.ok((await bucket.upload(`${a.shopId}/${a.inspectionId}/${randomUUID()}.jpg`, normalized, { contentType: "image/svg+xml" })).error);
  assert.ok((await bucket.upload(`${a.shopId}/${a.inspectionId}/${randomUUID()}.jpg`, new Uint8Array(photoLimit + 1), { contentType: "image/jpeg" })).error);
  console.log("PASS: decoded formats, forged/oversized input rejection, private upload/download, signed access, cross-shop and anonymous isolation, bucket MIME/size limits.");
} finally {
  for (const f of fixtures) {
    if (f.shopId) {
      assert.match(f.shopId, /^[0-9a-f-]{36}$/);
      sql(`delete from inspection_photos where shop_id='${f.shopId}'`);
      if (f.path) ok(await f.client.storage.from("inspection-photos").remove([f.path]));
      sql(`begin; delete from inspections where shop_id='${f.shopId}'; delete from work_orders where shop_id='${f.shopId}'; delete from vehicles where shop_id='${f.shopId}'; delete from customers where shop_id='${f.shopId}'; delete from auth.users where id='${f.userId}'; delete from shops where id='${f.shopId}'; commit;`);
    } else sql(`delete from auth.users where id='${f.userId}'`);
  }
}
