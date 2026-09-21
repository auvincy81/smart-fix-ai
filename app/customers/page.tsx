import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState, formatDate, panel, Pagination, primaryLink, Search } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { searchParams as parseSearch, workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const context = await requireShopContext();
  const { q, page, pattern, start, end } = parseSearch(await searchParams);
  const db = await workshopDb();
  let query = db.from("customers").select("*, vehicles(count)", { count: "exact" }).eq("shop_id", context.shop.id);
  if (q) query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`);
  const { data, count, error } = await query.order("last_name").order("id").range(start, end);
  if (error) throw new Error("Customer records are temporarily unavailable.");
  return <><PageHeader eyebrow={context.shop.name} title="Customers" description="Contact details, linked vehicles, and a lasting record of each customer." action={canManageRecords(context.role) ? <Link className={primaryLink} href="/customers/new">Add Customer</Link> : undefined} />
    <section className={panel}><Search q={q} label="Search first name, last name, phone, or email" />
      {data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{["Customer", "Phone", "Email", "Vehicles", "Created"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-3 py-4"><Link className="font-bold text-red-700 hover:underline" href={`/customers/${customer.id}`}>{customer.first_name} {customer.last_name}</Link></td><td className="px-3 py-4">{customer.phone || "—"}</td><td className="px-3 py-4">{customer.email || "—"}</td><td className="px-3 py-4">{customer.vehicles[0]?.count ?? 0}</td><td className="whitespace-nowrap px-3 py-4">{formatDate(customer.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title={q ? "No matching customers" : "No customers yet"} description={q ? "Try a different name, phone, or email." : "Add your first customer to start building your shop records."} />}
      <Pagination base="/customers" q={q} page={page} count={count ?? 0} />
    </section></>;
}
