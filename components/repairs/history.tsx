import Link from "next/link";
import { workshopDb } from "@/lib/workshop/data";
import { moneyText } from "@/lib/repairs/validation";
import { formatTime } from "@/lib/jobs/time";
import { panel } from "@/components/workshop/record-ui";

export async function RepairHistory({ shopId, customerId, vehicleId }: { shopId: string; customerId?: string; vehicleId?: string }) {
  const db = await workshopDb();
  let query = db.from("work_orders").select("id,work_order_number,mileage_in,mileage_out,completed_at").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(50);
  if (customerId) query = query.eq("customer_id", customerId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  const jobs = await query;
  if (jobs.error) throw new Error("Service history temporarily unavailable.");
  if (!jobs.data.length) return <section className={panel}><h2 className="text-xl font-bold">Repair & Recommendation History</h2><p className="mt-3 text-sm text-slate-500">No repair history has been recorded.</p></section>;
  const ids = jobs.data.map((j) => j.id);
  const [services, recommendations, estimates] = await Promise.all([
    db.from("work_order_services").select("id,work_order_id,description,completion_note,completed_at,status").eq("shop_id", shopId).in("work_order_id", ids).eq("status", "completed").order("completed_at", { ascending: false }),
    db.from("service_recommendations").select("id,work_order_id,title,priority,status,recommended_date,recommended_mileage,estimated_cost").eq("shop_id", shopId).in("work_order_id", ids).order("created_at", { ascending: false }),
    db.from("work_order_estimates").select("id,work_order_id,estimate_number,version,status,grand_total,is_current,responded_at").eq("shop_id", shopId).in("work_order_id", ids).order("created_at", { ascending: false }),
  ]);
  if (services.error || recommendations.error || estimates.error) throw new Error("Service history temporarily unavailable.");
  const jobLink = (id: string | null) => id ? <Link className="text-sm font-bold text-red-700" href={`/work-orders/${id}`}>{jobs.data.find((j) => j.id === id)?.work_order_number}</Link> : null;
  return <section className={`${panel} space-y-6`}><h2 className="text-xl font-bold">Repair & Recommendation History</h2>
    <div><h3 className="font-bold">Completed Repairs</h3>{services.data.length ? <ul className="mt-3 space-y-4">{services.data.map((s) => <li key={s.id}><p className="font-semibold">{s.description} · {s.completed_at ? formatTime(s.completed_at) : "Completed"}</p><p className="whitespace-pre-wrap text-sm">{s.completion_note}</p>{jobLink(s.work_order_id)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No completed repairs.</p>}</div>
    <div><h3 className="font-bold">Recommendations</h3>{recommendations.data.length ? <ul className="mt-3 space-y-4">{recommendations.data.map((r) => <li key={r.id}><p>{r.title} · {r.priority} · {r.status}</p>{r.estimated_cost !== null ? <p className="text-sm">Estimated {moneyText(r.estimated_cost)} pre-tax</p> : null}{r.recommended_date || r.recommended_mileage !== null ? <p className="text-sm">Recommended: {r.recommended_date || "Date not set"}{r.recommended_mileage !== null ? ` · ${r.recommended_mileage.toLocaleString()} miles` : ""}</p> : null}{jobLink(r.work_order_id)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No recommendations.</p>}</div>
    <div><h3 className="font-bold">Estimates & Customer Decisions</h3><ul className="mt-3 space-y-3">{estimates.data.map((e) => <li key={e.id}><Link className="font-bold text-red-700" href={`/estimates/${e.id}`}>{e.estimate_number} · v{e.version} · {e.status.replaceAll("_", " ")}</Link><p className="text-sm">{moneyText(e.grand_total)} pre-tax{!e.is_current ? " · Historical version" : ""}</p></li>)}</ul></div>
    <div><h3 className="font-bold">Mileage Progression</h3><ul className="mt-3 space-y-3">{jobs.data.filter((j) => j.completed_at).map((j) => <li key={j.id} className="text-sm">{formatTime(j.completed_at!)} · {j.mileage_in?.toLocaleString() ?? "Not recorded"} → {j.mileage_out?.toLocaleString() ?? "Not recorded"} miles · {jobLink(j.id)}</li>)}</ul></div>
    <p className="text-xs text-slate-500">History across the 50 newest work orders. Older records remain available through Work Orders.</p>
  </section>;
}
