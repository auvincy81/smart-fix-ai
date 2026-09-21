import { SendDocumentLink } from "@/components/documents/shop-documents";
import { canManageRecords } from "@/lib/workshop/permissions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Details, panel } from "@/components/workshop/record-ui";
import { DiagnosisNotes } from "@/components/diagnoses/notes";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { recordId } from "@/lib/workshop/validation";
import { diagnosisResponseSchema, severityText } from "@/lib/diagnoses/validation";
import { formatTime } from "@/lib/jobs/time";

export default async function DiagnosisDetail({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const id = (await params).id;
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data: diagnosis, error } = await db.from("diagnoses").select("*").eq("shop_id", context.shop.id).eq("id", id).maybeSingle();
  if (error) throw new Error("Saved diagnoses are temporarily unavailable.");
  if (!diagnosis) notFound();
  const job = await db.from("work_orders").select("status").eq("id", diagnosis.work_order_id).eq("shop_id", context.shop.id).single();
  if (job.error) throw new Error("Work order temporarily unavailable.");
  const parsed = diagnosisResponseSchema.safeParse(diagnosis.ai_response);
  const result = parsed.success ? parsed.data : null;
  return <div className="space-y-6"><Link className="text-sm font-bold text-red-700" href={`/work-orders/${diagnosis.work_order_id}`}>← Back to Work Order</Link><PageHeader eyebrow={context.shop.name} title="Saved Diagnosis" description={formatTime(diagnosis.created_at)} />
    {!["completed", "cancelled"].includes(job.data.status) ? <Link className="inline-flex min-h-12 items-center rounded-xl bg-red-600 px-5 py-3 font-bold text-white" href={`/recommendations/new?workOrderId=${diagnosis.work_order_id}&diagnosisId=${diagnosis.id}`}>Add Recommendation</Link> : null}
    {canManageRecords(context.role) ? <SendDocumentLink kind="diagnosis" id={diagnosis.id} /> : null}
    <section className={panel}><Details entries={[["Severity", severityText(diagnosis.severity)], ["AI summary", diagnosis.ai_summary], ["Symptoms", diagnosis.symptoms], ["Codes", diagnosis.diagnostic_codes], ["Recorded by", diagnosis.technician_id ? `Staff ${diagnosis.technician_id.slice(0, 8)}` : null]]} /></section>
    {result ? <><section className={panel}><h2 className="mb-4 text-xl font-bold">Likely Causes</h2><ul className="space-y-4">{result.likely_causes.map((cause, index) => <li key={index}><p className="font-bold">{cause.cause} · {Math.round(cause.probability * 100)}%</p><p className="text-sm">{cause.why}</p></li>)}</ul></section>{([["Quick Checks", result.quick_checks], ["Recommended Tests", result.recommended_tests], ["Safety Notes", result.safety_notes], ["Follow-up Questions", result.follow_up_questions]] as const).map(([title, values]) => <section key={title} className={panel}><h2 className="mb-3 text-xl font-bold">{title}</h2>{values.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{values.map((v, i) => <li key={i}>{v}</li>)}</ul> : <p className="text-sm text-slate-500">None recorded.</p>}</section>)}</> : null}
    <details className={panel}><summary className="cursor-pointer font-bold">Complete Saved AI Response</summary><pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(diagnosis.ai_response, null, 2)}</pre></details>
    <DiagnosisNotes id={diagnosis.id} initialFindings={diagnosis.technician_findings} initialCause={diagnosis.confirmed_cause} />
  </div>;
}
