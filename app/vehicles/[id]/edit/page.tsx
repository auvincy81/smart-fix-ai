import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/workshop/record-form";
import { vehicleTitle } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { customerOptions, getVehicle } from "@/lib/workshop/data";
import { saveVehicle } from "@/lib/workshop/actions";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const vehicle = await getVehicle(context.shop.id, (await params).id);
  if (!canManageRecords(context.role)) redirect(`/vehicles/${vehicle.id}`);
  return <><PageHeader eyebrow={context.shop.name} title="Edit Vehicle" description={vehicleTitle(vehicle)} /><RecordForm kind="vehicle" initial={{ ...vehicle }} customers={await customerOptions(context.shop.id, vehicle.customerId)} action={saveVehicle.bind(null, vehicle.id)} cancelHref={`/vehicles/${vehicle.id}`} submitLabel="Save Changes" /></>;
}
