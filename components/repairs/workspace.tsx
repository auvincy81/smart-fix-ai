import { SendDocumentLink } from "@/components/documents/shop-documents";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { repairData } from "@/lib/repairs/data";
import { moneyText, sumMoney } from "@/lib/repairs/validation";
import { workshopDb } from "@/lib/workshop/data";
import { formatTime } from "@/lib/jobs/time";
import { panel, primaryLink, secondaryLink } from "@/components/workshop/record-ui";
import { RepairForm, type RepairField } from "./form";

type Job = { id: string; status: string; mileageIn: number | null };
type Props = { shopId: string; job: Job; manage: boolean; memberId: string; editing?: boolean };
export async function RepairWorkspace({ shopId, job, manage, memberId, editing = false }: Props) {
  const data = await repairData(shopId, job.id);
  const current = data.estimates.find((e) => e.is_current);
  const closed = ["completed", "cancelled"].includes(job.status);
  const canPrice = manage && !closed && ["open", "diagnosing", "waiting_approval", "approved"].includes(job.status) && (!current || current.status === "draft");
  const db = await workshopDb();
  const techs = editing && canPrice ? await db.rpc("list_shop_technicians", { p_shop_id: shopId }) : null;
  if (techs?.error) throw new Error("Technicians unavailable.");
  const technicianOptions = [{ value: "", label: "Unassigned" }, { value: memberId, label: "Me" }, ...(techs?.data ?? []).filter((t) => t.id !== memberId).map((t) => ({ value: t.id, label: t.label }))];
  const serviceFields = (s?: typeof data.services[number]): RepairField[] => [
    { name: "description", label: "Service / repair", required: true, value: s?.description },
    { name: "category", label: "Category", value: s?.service_category },
    { name: "customer_description", label: "Customer-facing explanation", type: "textarea", value: s?.customer_description },
    { name: "labor_hours", label: "Labor hours", type: "number", value: s?.labor_hours ?? 0 },
    { name: "labor_rate", label: "Labor rate (USD / hour)", type: "number", value: s?.labor_rate ?? 0 },
    { name: "fees_amount", label: "Fees (USD)", type: "number", value: s?.fees_amount ?? 0 },
    { name: "technician_id", label: "Technician", type: "select", value: s?.technician_id, options: technicianOptions },
    { name: "sort_order", label: "Display order", type: "number", step: "1", value: s?.sort_order ?? data.services.length },
  ];
  const partFields = (p?: typeof data.parts[number]): RepairField[] => [
    { name: "part_name", label: "Part name", required: true, value: p?.part_name }, { name: "part_number", label: "Part number / SKU", value: p?.part_number },
    { name: "description", label: "Part description", value: p?.description }, { name: "quantity", label: "Quantity", type: "number", step: "0.001", required: true, value: p?.quantity ?? 1 },
    { name: "unit_price", label: "Unit price (customer, USD)", type: "number", required: true, value: p?.unit_price ?? 0 },
    ...(!p ? [{ name: "unit_cost", label: "Unit cost (internal, optional USD)", type: "number" as const }] : []),
  ];
  return <div className="space-y-6">
    <section className={panel}><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">Estimate & Repairs</h2>{!editing ? <Link className={primaryLink} href={`/work-orders/${job.id}/estimate`}>{manage && !closed ? "Manage Estimate / Repairs" : "View Repair Details"}</Link> : null}</div>
      <p className="mt-3 text-sm text-slate-500">All amounts are USD, pre-tax. Presented estimates preserve the prices the customer reviewed.</p>
      <p className="mt-4 text-2xl font-extrabold">{moneyText(current?.grand_total ?? sumMoney(data.services.map((s) => s.total_amount.toFixed(2))))} <span className="text-sm font-normal">full estimate · pre-tax</span></p>
      {current ? <div className="mt-4 space-y-2"><Link className="font-bold text-red-700" href={`/estimates/${current.id}`}>{current.estimate_number} · Version {current.version}</Link><p className="font-bold capitalize">{current.status.replaceAll("_", " ")}</p><p className="text-sm">Labor {moneyText(current.labor_total)} · Parts {moneyText(current.parts_total)} · Fees {moneyText(current.fees_total)}</p></div> : <p className="mt-3 text-sm">No estimate has been created.</p>}
      {editing && manage && !closed ? <div className="mt-6 space-y-5">
        {!current && canPrice && data.services.length ? <RepairForm jobId={job.id} action="draft" label="Create Draft Estimate" /> : null}
        {current?.status === "draft" ? <RepairForm jobId={job.id} action="estimate_notes" label="Save Draft Estimate Notes" fields={[{ name: "customer_note", label: "Customer note", type: "textarea", value: current.customer_note }, { name: "internal_note", label: "Internal note (never customer-facing)", type: "textarea", value: current.internal_note }]} /> : null}
        {current && ["draft", "presented"].includes(current.status) ? <RepairForm key={`approval-link-${current.id}`} jobId={job.id} action={current.status === "draft" ? "present" : "approval_link"} label={current.status === "draft" ? "Present Estimate" : "Generate Customer Approval Link"} confirmation={current.status === "draft" ? "I reviewed all repair explanations and pre-tax prices. Presenting freezes this version and creates a private approval link." : "Create a new private link and invalidate any previous unanswered link."} /> : null}
        {current?.status === "presented" ? <Link className={secondaryLink} href={`/estimates/${current.id}#staff-approval`}>Record Phone / In-Person Approval</Link> : null}
        {current && current.status !== "draft" && !data.services.some((s) => ["in_progress", "completed"].includes(s.status)) ? <RepairForm jobId={job.id} action="revise" label="Revise Estimate" confirmation="Create a new draft version and request fresh decisions for every repair. Prior prices and decisions remain in history; old pending links stop working." /> : null}
      </div> : null}
      {data.estimates.length > 1 ? <details className="mt-5"><summary className="cursor-pointer font-bold">Estimate version history</summary><ul className="mt-3 space-y-2">{data.estimates.map((e) => <li key={e.id}><Link className="text-red-700" href={`/estimates/${e.id}`}>{e.estimate_number} · v{e.version} · {e.status.replaceAll("_", " ")}{!e.is_current ? " · historical" : ""}</Link></li>)}</ul></details> : null}
    </section>
    <section className={`${panel} space-y-5`}><h2 className="text-xl font-bold">Services & Parts</h2>{!data.services.length ? <p className="text-sm text-slate-500">No repairs have been added.</p> : null}
      {data.services.map((s) => <article key={s.id} className="space-y-4 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{s.description}</h3><span className={`rounded-full px-3 py-1 text-sm font-bold ${s.status === "completed" ? "bg-emerald-50 text-emerald-800" : s.status === "declined" ? "bg-red-50 text-red-800" : "bg-slate-100"}`}>{s.status.replaceAll("_", " ")}</span></div><p className="whitespace-pre-wrap text-sm">{s.customer_description}</p><p className="text-sm">Labor {s.labor_hours ?? 0} h × {moneyText(s.labor_rate)} = {moneyText(s.labor_amount)} · Parts {moneyText(s.parts_amount)} · Fees {moneyText(s.fees_amount)}</p><p className="font-bold">Service total: {moneyText(s.total_amount)} pre-tax</p>
        {s.technician_id ? <p className="text-xs text-slate-500">Technician: Staff {s.technician_id.slice(0, 8)}</p> : null}{s.started_at ? <p className="text-sm">Started: {formatTime(s.started_at)}</p> : null}{s.completed_at ? <p className="text-sm">Completed: {formatTime(s.completed_at)}</p> : null}{s.completion_note ? <p className="whitespace-pre-wrap text-sm">Completion note: {s.completion_note}</p> : null}
        {data.parts.filter((p) => p.work_order_service_id === s.id).map((p) => <div key={p.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">{p.part_name}{p.part_number ? ` · ${p.part_number}` : ""}</p><p>{p.quantity} × {moneyText(p.unit_price)} = {moneyText(p.amount)} · {p.status}</p>{editing && canPrice ? <details className="mt-3"><summary className="cursor-pointer font-bold">Edit Part</summary><div className="mt-3"><RepairForm jobId={job.id} action="part" label="Save Part" hidden={{ id: p.id, service_id: s.id }} fields={partFields(p)} /></div></details> : null}</div>)}
        {editing && canPrice ? <><details><summary className="cursor-pointer font-bold text-red-700">Edit Service / Repair</summary><div className="mt-4"><RepairForm jobId={job.id} action="service" label="Save Service" hidden={{ id: s.id }} fields={serviceFields(s)} /></div></details><details><summary className="cursor-pointer font-bold text-red-700">Add Part</summary><div className="mt-4"><RepairForm jobId={job.id} action="part" label="Add Part" repeat hidden={{ service_id: s.id, request_key: randomUUID() }} fields={partFields()} /></div></details></> : null}
        {editing && !closed && s.status === "approved" ? <RepairForm jobId={job.id} action="start" label={`Start Repair: ${s.description}`} hidden={{ id: s.id }} /> : null}
        {editing && !closed && s.status === "in_progress" ? <RepairForm jobId={job.id} action="complete_service" label={`Complete Service: ${s.description}`} hidden={{ id: s.id }} fields={[{ name: "completion_note", label: "Technician completion note", type: "textarea", required: true }]} /> : null}
      </article>)}
      {editing && canPrice ? <details open={!data.services.length}><summary className="cursor-pointer text-lg font-bold text-red-700">Add Service / Repair</summary><div className="mt-5"><RepairForm jobId={job.id} action="service" label="Add Service / Repair" repeat hidden={{ request_key: randomUUID() }} fields={serviceFields()} /></div></details> : null}
      {editing && job.status === "in_progress" ? data.services.every((s) => ["completed", "declined"].includes(s.status)) ? <RepairForm jobId={job.id} action="complete_job" label="Complete Work Order" fields={[{ name: "mileage_out", label: "Mileage out", type: "number", step: "1", required: true, value: job.mileageIn }]} confirmation="All approved repairs are complete. Finalize this work order and preserve its repair history." /> : <p className="text-sm text-amber-800">Complete all approved repairs before finalizing the work order.</p> : null}
    </section>
    <section className={`${panel} space-y-5`}><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Recommendations</h2>{!closed ? <Link className={secondaryLink} href={`/recommendations/new?workOrderId=${job.id}`}>Add Recommendation</Link> : null}</div>
      {!data.recommendations.length ? <p className="text-sm text-slate-500">No recommendations recorded.</p> : null}
      {data.recommendations.map((r) => { const service = data.services.find((s) => s.recommendation_id === r.id); return <article key={r.id} className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">{r.title}</h3>{manage ? <SendDocumentLink kind="recommendation" id={r.id} label="Send Recommendation" /> : null}<p className="whitespace-pre-wrap text-sm">{r.description}</p><p className="text-sm capitalize">{r.priority || "medium"} priority · {r.status}</p>{r.estimated_cost !== null ? <p className="text-sm">Estimated cost: {moneyText(r.estimated_cost)} pre-tax</p> : null}{r.diagnosis_id ? <Link className="text-sm text-red-700" href={`/diagnoses/${r.diagnosis_id}`}>Source diagnosis</Link> : r.inspection_id ? <Link className="text-sm text-red-700" href={`/inspections/${r.inspection_id}`}>Source inspection finding</Link> : <p className="text-xs text-slate-500">Manual recommendation</p>}
        {(r.recommended_date || r.recommended_mileage !== null) ? <p className="text-sm font-bold">Future service: {r.recommended_date || "Date not set"}{r.recommended_mileage !== null ? ` · ${r.recommended_mileage.toLocaleString()} miles` : ""}</p> : null}
        {editing && canPrice && !service && r.status !== "completed" ? <RepairForm jobId={job.id} action="from_recommendation" label="Add to Estimate" hidden={{ id: r.id }} /> : null}
        {editing && r.status !== "completed" && (!service || ["planned", "declined"].includes(service.status)) ? <details><summary className="cursor-pointer font-bold">Mark for Future Service</summary><div className="mt-4"><RepairForm jobId={job.id} action="future" label="Save Future Recommendation" hidden={{ id: r.id }} fields={[{ name: "recommended_date", label: "Recommended date", type: "date", value: r.recommended_date }, { name: "recommended_mileage", label: "Recommended mileage", type: "number", step: "1", value: r.recommended_mileage }]} /></div></details> : null}
      </article>; })}
    </section>
    {data.audits.length ? <section className={`${panel} space-y-4`}><h2 className="text-xl font-bold">Customer Authorization History</h2>{data.audits.map((a) => <article key={a.id} className="border-t border-slate-100 pt-3"><p className="font-bold">Customer authorization recorded · {a.method.replaceAll("_", " ")}</p><p className="text-sm">{a.customer_name} · {formatTime(a.responded_at)}</p><p className="text-sm">{a.approved_item_ids.length} approved · {a.declined_item_ids.length} declined</p><p className="whitespace-pre-wrap text-sm">{a.customer_note}</p><Link className="text-sm text-red-700" href={`/estimates/${a.estimate_id}`}>View authorized estimate</Link></article>)}</section> : null}
  </div>;
}
