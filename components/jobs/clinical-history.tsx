import Link from "next/link";
import { workshopDb } from "@/lib/workshop/data";
import { panel, primaryLink, secondaryLink } from "@/components/workshop/record-ui";
import { StatusBadge } from "./job-ui";
import { formatTime } from "@/lib/jobs/time";
import { typeLabel, resultLabel } from "@/lib/inspections/validation";
import { severityText } from "@/lib/diagnoses/validation";

export async function ClinicalHistory({ shopId, workOrderId, vehicleId, customerId }: { shopId: string; workOrderId?: string; vehicleId?: string; customerId?: string }) {
  const db = await workshopDb();
  let diagnosesQuery = db.from("diagnosis_listing").select("*").eq("shop_id", shopId);
  let inspectionsQuery = db.from("inspection_listing").select("*").eq("shop_id", shopId);
  if (workOrderId) { diagnosesQuery = diagnosesQuery.eq("work_order_id", workOrderId); inspectionsQuery = inspectionsQuery.eq("work_order_id", workOrderId); }
  if (vehicleId) { diagnosesQuery = diagnosesQuery.eq("vehicle_id", vehicleId); inspectionsQuery = inspectionsQuery.eq("vehicle_id", vehicleId); }
  if (customerId) { diagnosesQuery = diagnosesQuery.eq("customer_id", customerId); inspectionsQuery = inspectionsQuery.eq("customer_id", customerId); }
  const [diagnoses, inspections] = await Promise.all([diagnosesQuery.order("created_at", { ascending: false }).limit(50), inspectionsQuery.order("created_at", { ascending: false }).limit(50)]);
  if (diagnoses.error || inspections.error) throw new Error("Saved diagnoses and inspections are temporarily unavailable.");
  return <div className="grid gap-6 lg:grid-cols-2"><section className={panel}><h2 className="text-xl font-bold">Saved Diagnoses</h2>{workOrderId ? <Link className={`${primaryLink} mt-4`} href={`/diagnosis?workOrderId=${workOrderId}${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}>Start AI Diagnosis</Link> : null}
    {diagnoses.data.length ? <ul className="mt-5 space-y-5">{diagnoses.data.map((d) => <li key={d.id} className="border-t border-slate-100 pt-4"><Link className="font-bold text-red-700" href={`/diagnoses/${d.id}`}>{formatTime(d.created_at!)} · {severityText(d.severity)}</Link><p className="mt-2 whitespace-pre-wrap text-sm">{d.ai_summary || "No summary provided"}</p><p className="mt-2 text-sm">Symptoms: {d.symptoms || "Not recorded"}</p><p className="text-sm">Codes: {d.diagnostic_codes || "Not recorded"}</p><p className="text-xs text-slate-500">{d.technician_id ? `Staff ${d.technician_id.slice(0, 8)}` : "Unassigned"}</p>{!workOrderId ? <Link className="mt-2 inline-block text-sm text-red-700" href={`/work-orders/${d.work_order_id}`}>{d.work_order_number}</Link> : null}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No diagnoses have been saved.</p>}<p className="mt-4 text-xs text-slate-500">Showing up to 50 newest saved diagnoses.</p></section>
    <section className={panel}><h2 className="text-xl font-bold">Inspections</h2>{workOrderId ? <div className="mt-4 flex flex-wrap gap-3"><Link className={primaryLink} href={`/inspections/new?workOrderId=${workOrderId}&type=multipoint`}>Start Inspection</Link><Link className={secondaryLink} href={`/inspections/new?workOrderId=${workOrderId}&type=pre_inspection`}>Start Pre-Inspection</Link></div> : null}
      {inspections.data.length ? <ul className="mt-5 space-y-4">{inspections.data.map((i) => <li key={i.id} className="space-y-2 border-t border-slate-100 pt-4"><Link className="block font-bold text-red-700" href={`/inspections/${i.id}`}>{typeLabel(i.inspection_type)} · {formatTime(i.created_at!)}</Link><StatusBadge status={i.status ?? "draft"} />{i.inspection_type === "pre_inspection" ? <p className="text-sm">{i.readiness_score ?? "—"}% · {resultLabel(i.readiness_result)}</p> : null}{!workOrderId ? <Link className="block text-sm text-red-700" href={`/work-orders/${i.work_order_id}`}>{i.work_order_number}</Link> : null}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No inspections have been created.</p>}<p className="mt-4 text-xs text-slate-500">Showing up to 50 newest inspections.</p><Link className="mt-2 inline-block text-sm font-bold text-red-700" href="/inspections">View Inspection List</Link>
    </section></div>;
}
