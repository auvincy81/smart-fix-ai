import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState, panel, primaryLink, secondaryLink } from "@/components/workshop/record-ui";
import { JobPagination, StatusBadge } from "@/components/jobs/job-ui";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb, searchParams as parseSearch } from "@/lib/workshop/data";
import { formatTime, todayBounds } from "@/lib/jobs/time";
import { typeLabel, resultLabel } from "@/lib/inspections/validation";
import { recentCutoff } from "@/lib/inspections/data";

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string; recent?: string; q?: string; page?: string }> }) {
  const context = await requireShopContext();
  const search = await searchParams;
  const { q, pattern, page, start, end } = parseSearch(search);
  const type = ["multipoint", "pre_inspection"].includes(search.type ?? "") ? search.type! : "";
  const status = ["draft", "in_progress", "completed"].includes(search.status ?? "") ? search.status! : "";
  const recent = ["today", "7", "30"].includes(search.recent ?? "") ? search.recent! : "";
  const db = await workshopDb();
  let query = db.from("inspection_listing").select("*", { count: "exact" }).eq("shop_id", context.shop.id);
  if (type) query = query.eq("inspection_type", type);
  if (status) query = query.eq("status", status);
  if (recent === "today") { const bounds = todayBounds(); query = query.gte("created_at", bounds.start).lt("created_at", bounds.end); }
  else if (recent) query = query.gte("created_at", recentCutoff(Number(recent)));
  if (q) query = query.or(`customer_name.ilike.${pattern},vehicle_name.ilike.${pattern},vin.ilike.${pattern},work_order_number.ilike.${pattern}`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw new Error("Inspections are temporarily unavailable.");
  const select = "mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-normal";
  return <><PageHeader eyebrow={context.shop.name} title="Inspections" description="Saved vehicle findings and generic pre-inspection readiness. Times shown in New York time." action={<Link className={primaryLink} href="/inspections/new">New Inspection</Link>} /><section className={panel}>
    <form className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><label className="text-xs font-bold">Search<input className={select} name="q" defaultValue={q} placeholder="Customer, vehicle, VIN, work order" maxLength={100} /></label><label className="text-xs font-bold">Type<select name="type" className={select} defaultValue={type}><option value="">All types</option><option value="multipoint">Multi-Point</option><option value="pre_inspection">Pre-Inspection Readiness</option></select></label><label className="text-xs font-bold">Status<select name="status" className={select} defaultValue={status}><option value="">All statuses</option><option value="draft">Draft</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></label><label className="text-xs font-bold">Date / recent<select name="recent" className={select} defaultValue={recent}><option value="">All dates</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label><button className={`${secondaryLink} self-end`}>Apply Filters</button></form>
    {data.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Inspection", "Customer / Vehicle", "Work order", "Status", "Technician", "Date", "Readiness"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map((r) => <tr key={r.id}><td className="p-3"><Link className="font-bold text-red-700" href={`/inspections/${r.id}`}>{typeLabel(r.inspection_type)}</Link></td><td className="p-3"><Link href={`/customers/${r.customer_id}`}>{r.customer_name}</Link><Link className="block" href={`/vehicles/${r.vehicle_id}`}>{r.vehicle_name || r.vin || "Vehicle details pending"}</Link></td><td className="p-3"><Link className="whitespace-nowrap text-red-700" href={`/work-orders/${r.work_order_id}`}>{r.work_order_number}</Link></td><td className="p-3"><StatusBadge status={r.status ?? "draft"} /></td><td className="p-3">{r.technician_id ? `Staff ${r.technician_id.slice(0, 8)}` : "Unassigned"}</td><td className="whitespace-nowrap p-3">{formatTime(r.created_at!)}</td><td className="p-3">{r.inspection_type === "pre_inspection" ? `${r.readiness_score ?? "—"}% · ${resultLabel(r.readiness_result)}` : "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="No inspections found" description="Try another filter or start a new inspection from a work order." />}
    <JobPagination base="/inspections" query={{ type, status, recent, q }} page={page} count={count ?? 0} />
  </section></>;
}
