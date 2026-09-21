import Link from "next/link";
import { statusLabel } from "@/lib/jobs/status";
import { formatTime } from "@/lib/jobs/time";
import { panel, EmptyState, secondaryLink } from "@/components/workshop/record-ui";
import { workshopDb } from "@/lib/workshop/data";

export function StatusBadge({ status }: { status: string }) {
  const color = status === "completed" || status === "approved" ? "bg-emerald-50 text-emerald-800" : status === "cancelled" || status === "no_show" ? "bg-slate-100 text-slate-600" : status === "waiting_approval" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800";
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${color}`}>{statusLabel(status)}</span>;
}
export function JobFilters({ q, status, statuses, period, kind, customerId, vehicleId }: { q: string; status: string; statuses: readonly string[]; period?: string; kind: "appointment" | "work-order"; customerId?: string; vehicleId?: string }) {
  return <form className="mb-5 grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
    {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
    {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
    <label className="flex-1 text-xs font-bold text-slate-600">Search<input name="q" defaultValue={q} maxLength={100} placeholder={kind === "appointment" ? "Customer, vehicle, VIN, or concern" : "Number, customer, vehicle, VIN, or complaint"} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal" /></label>
    {kind === "appointment" ? <label className="text-xs font-bold text-slate-600">Date range<select name="period" defaultValue={period || "upcoming"} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal"><option value="upcoming">Upcoming</option><option value="today">Today</option><option value="all">All dates</option></select></label> : null}
    <label className="text-xs font-bold text-slate-600">Status<select name="status" defaultValue={status} className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-normal"><option value="">All statuses</option>{statuses.map((s) => <option value={s} key={s}>{statusLabel(s)}</option>)}</select></label><button className={secondaryLink}>Apply Filters</button>
  </form>;
}
export function JobPagination({ base, query, page, count }: { base: string; query: Record<string, string>; page: number; count: number }) {
  const href = (p: number) => `${base}?${new URLSearchParams({ ...query, page: String(p) })}`;
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><span>{count} records · Page {page}</span><div className="flex gap-3">{page > 1 ? <Link className={secondaryLink} href={href(page - 1)}>Previous</Link> : null}{page * 25 < count ? <Link className={secondaryLink} href={href(page + 1)}>Next</Link> : null}</div></div>;
}
export async function RelatedJobs({ shopId, customerId, vehicleId }: { shopId: string; customerId: string; vehicleId?: string }) {
  const db = await workshopDb();
  let appointmentsQuery = db.from("appointments").select("id, scheduled_start, status").eq("shop_id", shopId).eq("customer_id", customerId);
  let ordersQuery = db.from("work_orders").select("id, work_order_number, status").eq("shop_id", shopId).eq("customer_id", customerId);
  if (vehicleId) { appointmentsQuery = appointmentsQuery.eq("vehicle_id", vehicleId); ordersQuery = ordersQuery.eq("vehicle_id", vehicleId); }
  const [appointments, orders] = await Promise.all([appointmentsQuery.order("scheduled_start", { ascending: false }).limit(10), ordersQuery.order("created_at", { ascending: false }).limit(10)]);
  if (appointments.error || orders.error) throw new Error("Job history is temporarily unavailable.");
  return <div className="grid gap-6 lg:grid-cols-2"><section className={panel}><h2 className="mb-4 text-lg font-bold">Appointments</h2>{appointments.data.length ? <ul className="space-y-4">{appointments.data.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2"><Link href={`/appointments/${a.id}`} className="font-semibold text-red-700">{formatTime(a.scheduled_start)}</Link><StatusBadge status={a.status} /></li>)}</ul> : <EmptyState title="No appointments yet" description="Schedule a visit to start the service workflow." />}<p className="mt-4 text-xs text-slate-500">Up to 10 most recent appointments.</p><Link className="mt-2 inline-block text-sm font-bold text-red-700" href={`/appointments?period=all&customerId=${customerId}${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}>View all appointments</Link></section>
    <section className={panel}><h2 className="mb-4 text-lg font-bold">Work Orders</h2>{orders.data.length ? <ul className="space-y-4">{orders.data.map((w) => <li key={w.id} className="flex flex-wrap items-center justify-between gap-2"><Link href={`/work-orders/${w.id}`} className="font-semibold text-red-700">{w.work_order_number}</Link><StatusBadge status={w.status} /></li>)}</ul> : <EmptyState title="No work orders yet" description="Create a work order when the vehicle is ready for service." />}<p className="mt-4 text-xs text-slate-500">Up to 10 most recent work orders.</p><Link className="mt-2 inline-block text-sm font-bold text-red-700" href={`/work-orders?customerId=${customerId}${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}>View all work orders</Link></section></div>;
}
