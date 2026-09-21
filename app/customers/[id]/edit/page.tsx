import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/workshop/record-form";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer } from "@/lib/workshop/data";
import { saveCustomer } from "@/lib/workshop/actions";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireShopContext();
  const customer = await getCustomer(context.shop.id, (await params).id);
  if (!canManageRecords(context.role)) redirect(`/customers/${customer.id}`);
  return <><PageHeader eyebrow={context.shop.name} title="Edit Customer" description={`${customer.firstName} ${customer.lastName}`} /><RecordForm kind="customer" initial={{ ...customer }} action={saveCustomer.bind(null, customer.id)} cancelHref={`/customers/${customer.id}`} submitLabel="Save Changes" /></>;
}
