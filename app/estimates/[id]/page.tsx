import { SendDocumentLink } from "@/components/documents/shop-documents";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ApprovalForm } from "@/components/repairs/approval";
import { requireShopContext } from "@/lib/auth/session";
import { estimateData } from "@/lib/repairs/data";
import { moneyText, portalSchema } from "@/lib/repairs/validation";
import { canManageRecords } from "@/lib/workshop/permissions";
import { formatTime } from "@/lib/jobs/time";
import { panel } from "@/components/workshop/record-ui";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const { estimate: e, items, audits } = await estimateData(context.shop.id, (await params).id);
  const snapshot = e.customer_snapshot && typeof e.customer_snapshot === "object" && !Array.isArray(e.customer_snapshot) ? e.customer_snapshot : {};
  const portal = portalSchema.safeParse({ ...snapshot, estimate_number: e.estimate_number, version: e.version, status: e.status, customer_note: e.customer_note, labor_total: String(e.labor_total), parts_total: String(e.parts_total), fees_total: String(e.fees_total), grand_total: String(e.grand_total), pre_tax: true,
    items: items.map((i) => ({ line: i.line_number, description: i.description, category: i.category, labor_hours: String(i.labor_hours), labor_rate: String(i.labor_rate), labor_amount: i.labor_amount.toFixed(2), parts_amount: i.parts_amount.toFixed(2), fees_amount: i.fees_amount.toFixed(2), total_amount: i.total_amount.toFixed(2), parts: i.parts_snapshot, decision: i.decision })) });
  return <div className="space-y-6"><Link className="text-sm font-bold text-red-700" href={`/work-orders/${e.work_order_id}/estimate`}>← Estimate & Repairs</Link><PageHeader eyebrow={context.shop.name} title={`${e.estimate_number} · Version ${e.version}`} description={`${e.status.replaceAll("_", " ")}${!e.is_current ? " · Historical version" : ""} · All amounts pre-tax`} />
    {e.presented_at && !["void", "superseded"].includes(e.status) && canManageRecords(context.role) ? <div className="flex flex-wrap gap-3"><SendDocumentLink kind="estimate" id={e.id} label="Send Estimate" />{e.is_current && e.status === "presented" ? <SendDocumentLink kind="approval_request" id={e.id} label="Send Approval Request" /> : null}</div> : null}
    <section className={`${panel} space-y-3`}><p className="text-2xl font-bold">{moneyText(e.grand_total)} pre-tax</p><p>Labor {moneyText(e.labor_total)} · Parts {moneyText(e.parts_total)} · Fees {moneyText(e.fees_total)}</p><p className="whitespace-pre-wrap">Customer note: {e.customer_note || "None"}</p>{canManageRecords(context.role) ? <p className="whitespace-pre-wrap text-sm text-slate-500">Internal note: {e.internal_note || "None"}</p> : null}<p className="text-sm">Presented: {e.presented_at ? formatTime(e.presented_at) : "Not yet presented"}</p></section>
    {items.map((i) => <section key={i.id} className={`${panel} space-y-2`}><h2 className="text-lg font-bold">{i.line_number}. {i.description}</h2><p>{moneyText(i.total_amount)} · {i.decision}</p><p className="text-sm">Labor {i.labor_hours} h × {moneyText(i.labor_rate)} = {moneyText(i.labor_amount)} · Parts {moneyText(i.parts_amount)} · Fees {moneyText(i.fees_amount)}</p>{i.decision_at ? <p className="text-sm">Decision recorded {formatTime(i.decision_at)}</p> : null}</section>)}
    {audits.map((a) => <section key={a.id} className={`${panel} space-y-2`}><h2 className="font-bold">Customer authorization recorded</h2><p>{a.customer_name} · {a.method.replaceAll("_", " ")} · {formatTime(a.responded_at)}</p><p>{a.approved_item_ids.length} approved · {a.declined_item_ids.length} declined</p><p className="whitespace-pre-wrap">{a.customer_note}</p><p className="text-sm">{a.acknowledgment}</p></section>)}
    {e.is_current && e.status === "presented" && canManageRecords(context.role) && portal.success ? <section id="staff-approval" className="space-y-5"><h2 className="text-xl font-bold">Record Phone / In-Person Approval</h2><p className="text-sm">Record the customer&apos;s actual choices and response method. This also closes any pending portal link.</p><ApprovalForm estimate={portal.data} staffEstimateId={e.id} /></section> : null}
  </div>;
}
