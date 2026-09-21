import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { InspectionEditor } from "@/components/inspections/editor";
import { requireShopContext } from "@/lib/auth/session";
import { getInspection, inspectionItems } from "@/lib/inspections/data";
import { typeLabel } from "@/lib/inspections/validation";

export default async function EditInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const inspection = await getInspection(context.shop.id, (await params).id);
  if (inspection.status === "completed") redirect(`/inspections/${inspection.id}`);
  return <><PageHeader eyebrow={context.shop.name} title={typeLabel(inspection.inspection_type)} description="Record observations, measurements, and recommendations. Save progress before leaving." /><InspectionEditor key={inspection.id} inspection={inspection} items={await inspectionItems(inspection.id)} /></>;
}
