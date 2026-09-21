import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/workshop/record-form";
import { EmptyState, primaryLink } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { customerOptions, getCustomer } from "@/lib/workshop/data";
import { saveVehicle } from "@/lib/workshop/actions";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) redirect("/vehicles");
  const { customerId } = await searchParams;
  if (customerId) await getCustomer(context.shop.id, customerId);
  const customers = await customerOptions(context.shop.id);
  return <><PageHeader eyebrow={context.shop.name} title="Add Vehicle" description="Link a customer, decode an optional VIN, and review the details before saving." />
    {customers.length ? <RecordForm kind="vehicle" initial={{ customerId: customerId ?? "" }} customers={customers} action={saveVehicle.bind(null, null)} cancelHref={customerId ? `/customers/${customerId}` : "/vehicles"} submitLabel="Save Vehicle" /> : <><EmptyState title="Add a customer first" description="Every vehicle needs a customer in your shop." /><Link href="/customers/new" className={`${primaryLink} mt-4`}>Add Customer</Link></>}
  </>;
}
