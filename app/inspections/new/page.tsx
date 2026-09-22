import { randomUUID } from "node:crypto";
import { PageHeader } from "@/components/page-header";
import { NewInspectionForm } from "@/components/inspections/new-form";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { inspectionOptions } from "@/lib/inspections/data";

export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<{ workOrderId?: string; type?: string }> }) {
  const context = await requireShopContext();
  const query = await searchParams;
  const order = query.workOrderId ? await getWorkOrder(context.shop.id, query.workOrderId) : null;
  const options = await inspectionOptions(context.shop.id, context.membership, order?.id);
  return <><PageHeader eyebrow={context.shop.name} title="New Inspection" description="Start an empty checklist for a verified work order and vehicle." /><NewInspectionForm {...options} initialOrder={order?.id ?? ""} initialType={query.type === "pre_inspection" ? "pre_inspection" : "multipoint"} initialTechnician={order?.assignedTechnicianId ?? context.membership.id} requestKey={randomUUID()} /></>;
}
