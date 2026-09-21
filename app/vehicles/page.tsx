import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState, panel, Pagination, primaryLink, Search, vehicleTitle } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { searchParams as parseSearch, workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const context = await requireShopContext();
  const { q, page, pattern, start, end } = parseSearch(await searchParams);
  const db = await workshopDb();
  let query = db.from("vehicles").select("*, customers!vehicles_customer_fk(first_name, last_name)", { count: "exact" }).eq("shop_id", context.shop.id);
  if (q) query = query.or(`vin.ilike.${pattern},make.ilike.${pattern},model.ilike.${pattern},license_plate.ilike.${pattern}`);
  const { data, count, error } = await query.order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw new Error("Vehicle records are temporarily unavailable.");
  return <><PageHeader eyebrow={context.shop.name} title="Vehicles" description="Vehicle details and customer relationships, saved in your shop workspace." action={canManageRecords(context.role) ? <Link className={primaryLink} href="/vehicles/new">Add Vehicle</Link> : undefined} />
    <section className={panel}><Search q={q} label="Search VIN, make, model, or license plate" />
      {data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{["Vehicle", "VIN", "Customer", "Mileage", "Plate"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map((vehicle) => <tr key={vehicle.id} className="hover:bg-slate-50"><td className="px-3 py-4"><Link className="font-bold text-red-700 hover:underline" href={`/vehicles/${vehicle.id}`}>{vehicleTitle(vehicle)}</Link></td><td className="px-3 py-4 font-mono text-xs">{vehicle.vin || "—"}</td><td className="px-3 py-4"><Link className="hover:underline" href={`/customers/${vehicle.customer_id}`}>{vehicle.customers?.first_name} {vehicle.customers?.last_name}</Link></td><td className="px-3 py-4">{vehicle.mileage?.toLocaleString("en-US") ?? "—"}</td><td className="px-3 py-4">{[vehicle.license_plate, vehicle.plate_state].filter(Boolean).join(" · ") || "—"}</td></tr>)}</tbody></table></div> : <EmptyState title={q ? "No matching vehicles" : "No vehicles yet"} description={q ? "Try another VIN, make, model, or plate." : "Add a vehicle and link it to a customer to get started."} />}
      <Pagination base="/vehicles" q={q} page={page} count={count ?? 0} />
    </section></>;
}
