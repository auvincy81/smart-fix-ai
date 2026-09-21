import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RepairForm } from "@/components/repairs/form";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { workshopDb } from "@/lib/workshop/data";
import { recordId } from "@/lib/workshop/validation";

export default async function NewRecommendationPage({ searchParams }: { searchParams: Promise<{ workOrderId?: string; diagnosisId?: string; inspectionItemId?: string }> }) {
  const context = await requireShopContext();
  const search = await searchParams;
  const job = await getWorkOrder(context.shop.id, search.workOrderId ?? "");
  if (["completed", "cancelled"].includes(job.status)) notFound();
  const db = await workshopDb();
  let title = "", description = "", priority = "medium";
  const hidden: Record<string, string> = { request_key: randomUUID() };
  if (search.diagnosisId) {
    if (!recordId.safeParse(search.diagnosisId).success) notFound();
    const source = await db.from("diagnoses").select("id,ai_summary,severity").eq("shop_id", context.shop.id).eq("work_order_id", job.id).eq("id", search.diagnosisId).maybeSingle();
    if (source.error) throw new Error("Diagnosis temporarily unavailable.");
    if (!source.data) notFound();
    hidden.diagnosis_id = source.data.id; description = source.data.ai_summary ?? ""; priority = source.data.severity === "stop_driving" ? "urgent" : "medium";
  } else if (search.inspectionItemId) {
    if (!recordId.safeParse(search.inspectionItemId).success) notFound();
    const source = await db.from("inspection_items").select("id,inspection_id,item_name,recommendation,condition").eq("id", search.inspectionItemId).in("condition", ["attention", "urgent"]).maybeSingle();
    if (source.error) throw new Error("Finding temporarily unavailable.");
    if (!source.data) notFound();
    const parent = await db.from("inspections").select("id").eq("shop_id", context.shop.id).eq("work_order_id", job.id).eq("id", source.data.inspection_id).maybeSingle();
    if (!parent.data) notFound();
    hidden.inspection_item_id = source.data.id; title = source.data.item_name; description = source.data.recommendation ?? ""; priority = source.data.condition === "urgent" ? "urgent" : "high";
  }
  return <><Link className="text-sm font-bold text-red-700" href={`/work-orders/${job.id}/estimate`}>← Estimate & Repairs</Link><PageHeader eyebrow={context.shop.name} title="Add Recommendation" description={`${job.workOrderNumber} · Review the finding and write a clear customer-facing recommendation. Saving does not approve or start a repair.`} /><section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5"><RepairForm jobId={job.id} action="recommend" label="Save Recommendation" repeat hidden={hidden} fields={[
    { name: "title", label: "Recommendation title", required: true, value: title }, { name: "priority", label: "Priority", type: "select", value: priority, options: ["low", "medium", "high", "urgent"].map((value) => ({ value, label: value })) },
    { name: "description", label: "Customer-facing description", type: "textarea", value: description }, { name: "estimated_cost", label: "Estimated cost (USD, pre-tax)", type: "number" },
    { name: "recommended_date", label: "Future service date (optional)", type: "date" }, { name: "recommended_mileage", label: "Future service mileage (optional)", type: "number", step: "1" },
  ]} /></section></>;
}
