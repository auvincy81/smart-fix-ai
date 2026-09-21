import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Details, EmptyState, formatDate, panel, Pagination, primaryLink, secondaryLink, ServiceHistory, vehicleTitle } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer, workshopDb, searchParams as parseSearch } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const context = await requireShopContext();
  const customer = await getCustomer(context.shop.id, (await params).id);
  const { page, start, end } = parseSearch(await searchParams);
  const db = await workshopDb();
  const { data: vehicles, count, error } = await db.from("vehicles").select("*", { count: "exact" }).eq("shop_id", context.shop.id).eq("customer_id", customer.id).order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw new Error("Vehicle records are temporarily unavailable.");
  const canEdit = canManageRecords(context.role);
  return <><Link href="/customers" className="mb-4 inline-block text-sm font-semibold text-slate-600">← Customers</Link><PageHeader eyebrow={context.shop.name} title={`${customer.firstName} ${customer.lastName}`} description={`Customer since ${formatDate(customer.createdAt)}`} action={canEdit ? <Link className={secondaryLink} href={`/customers/${customer.id}/edit`}>Edit Customer</Link> : undefined} />
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><section className={panel}><h2 className="mb-5 text-lg font-bold">Contact information</h2><Details entries={[["Phone", customer.phone], ["Email", customer.email], ["Address", [customer.address, customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ") || null], ["Notes", customer.notes]]} /></section>
      <section className={panel}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Linked vehicles</h2>{canEdit ? <Link className={primaryLink} href={`/vehicles/new?customerId=${customer.id}`}>Add Vehicle</Link> : null}</div>
        {vehicles.length ? <ul className="divide-y divide-slate-100">{vehicles.map((vehicle) => <li key={vehicle.id} className="py-4"><Link href={`/vehicles/${vehicle.id}`} className="font-bold text-red-700 hover:underline">{vehicleTitle(vehicle)}</Link><p className="mt-1 text-sm text-slate-500">VIN: {vehicle.vin || "Not provided"} · {vehicle.mileage?.toLocaleString("en-US") ?? "—"} miles</p></li>)}</ul> : <EmptyState title="No linked vehicles" description="Add a vehicle to keep its details with this customer." />}
        <Pagination base={`/customers/${customer.id}`} q="" page={page} count={count ?? 0} />
      </section><div className="xl:col-span-2"><ServiceHistory /></div></div></>;
}
