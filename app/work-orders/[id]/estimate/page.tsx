import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RepairWorkspace } from "@/components/repairs/workspace";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function EstimateWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const job = await getWorkOrder(context.shop.id, (await params).id);
  return <><Link className="text-sm font-bold text-red-700" href={`/work-orders/${job.id}`}>← Work Order</Link><PageHeader eyebrow={context.shop.name} title={`${job.workOrderNumber} · Estimate & Repairs`} description="Review recommendations, prepare an estimate, record customer authorization, and complete approved repairs." /><RepairWorkspace shopId={context.shop.id} job={job} manage={canManageRecords(context.role)} memberId={context.membership.id} editing /></>;
}
