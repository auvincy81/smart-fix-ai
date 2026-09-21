import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RecordForm } from "@/components/workshop/record-form";
import { requireShopContext } from "@/lib/auth/session";
import { saveCustomer } from "@/lib/workshop/actions";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function NewCustomerPage() {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) redirect("/customers");
  return <><PageHeader eyebrow={context.shop.name} title="Add Customer" description="Save contact information now and link vehicles when you're ready." /><RecordForm kind="customer" action={saveCustomer.bind(null, null)} cancelHref="/customers" submitLabel="Save Customer" /></>;
}
