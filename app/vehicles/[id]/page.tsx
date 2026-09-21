import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Details, formatDate, panel, secondaryLink, ServiceHistory, vehicleTitle } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer, getVehicle } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const vehicle = await getVehicle(context.shop.id, (await params).id);
  const customer = await getCustomer(context.shop.id, vehicle.customerId);
  return <><Link href="/vehicles" className="mb-4 inline-block text-sm font-semibold text-slate-600">← Vehicles</Link><PageHeader eyebrow={context.shop.name} title={vehicleTitle(vehicle)} description={`Added ${formatDate(vehicle.createdAt)}`} action={canManageRecords(context.role) ? <Link className={secondaryLink} href={`/vehicles/${vehicle.id}/edit`}>Edit Vehicle</Link> : undefined} />
    <div className="space-y-6"><section className={panel}><h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer</h2><Link className="mt-2 inline-block text-lg font-bold text-red-700 hover:underline" href={`/customers/${customer.id}`}>{customer.firstName} {customer.lastName}</Link></section><section className={panel}><h2 className="mb-5 text-lg font-bold">Vehicle details</h2><Details entries={[["VIN", vehicle.vin], ["Year", vehicle.year], ["Make", vehicle.make], ["Model", vehicle.model], ["Trim", vehicle.trim], ["Engine", vehicle.engine], ["License plate", vehicle.licensePlate], ["Plate state", vehicle.plateState], ["Color", vehicle.color], ["Mileage", vehicle.mileage?.toLocaleString("en-US") ?? null], ["Notes", vehicle.notes]]} /></section><ServiceHistory /></div></>;
}
