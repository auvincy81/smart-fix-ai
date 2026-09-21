import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState, panel, primaryLink } from "@/components/workshop/record-ui";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb, searchParams as parseSearch } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { recordId } from "@/lib/workshop/validation";
import { appointmentStatuses, workOrderStatuses } from "@/lib/jobs/status";
import { formatTime, todayBounds } from "@/lib/jobs/time";
import { JobFilters, JobPagination, StatusBadge } from "./job-ui";

export type JobSearch = { q?: string; page?: string; status?: string; period?: string; customerId?: string; vehicleId?: string };
export async function JobList({ kind, search }: { kind: "appointment" | "work-order"; search: JobSearch }) {
  const context = await requireShopContext();
  const db = await workshopDb();
  const appt = kind === "appointment";
  const base = appt ? "/appointments" : "/work-orders";
  const statuses = appt ? appointmentStatuses : workOrderStatuses;
  const status = statuses.find((s) => s === search.status) ?? "";
  const period = search.period === "all" || search.period === "today" ? search.period : "upcoming";
  const { q, pattern, page, start, end } = parseSearch(search);
  let query = appt ? db.from("appointment_listing").select("*", { count: "exact" }) : db.from("work_order_listing").select("*", { count: "exact" });
  query = query.eq("shop_id", context.shop.id);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`customer_name.ilike.${pattern},vehicle_name.ilike.${pattern},vin.ilike.${pattern},${appt ? "customer_concern" : "work_order_number"}.ilike.${pattern}${appt ? "" : `,customer_complaint.ilike.${pattern}`}`);
  const customerId = recordId.safeParse(search.customerId).success ? search.customerId! : "";
  const vehicleId = recordId.safeParse(search.vehicleId).success ? search.vehicleId! : "";
  if (customerId) query = query.eq("customer_id", customerId);
  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (appt && period === "today") { const bounds = todayBounds(); query = query.gte("scheduled_start", bounds.start).lt("scheduled_start", bounds.end); }
  if (appt && period === "upcoming") query = query.gte("scheduled_start", new Date().toISOString());
  const { data, error, count } = await query.order(appt ? "scheduled_start" : "created_at", { ascending: appt }).order("id").range(start, end);
  if (error) throw new Error("Job records are temporarily unavailable.");
  return <><PageHeader eyebrow={context.shop.name} title={appt ? "Appointments" : "Work Orders"} description={appt ? "Plan visits, check in customers, and start service. Times shown in America/New_York." : "Track each job from intake through diagnosis, approval, and completion."} action={canManageRecords(context.role) ? <Link className={primaryLink} href={`${base}/new`}>{appt ? "New Appointment" : "New Work Order"}</Link> : undefined} />
    <section className={panel}>
      {(customerId || vehicleId) ? <p className="mb-4 text-sm text-slate-600">Showing linked records. <Link className="font-bold text-red-700" href={base}>Clear customer/vehicle filter</Link></p> : null}
      <JobFilters q={q} status={status} statuses={statuses} period={period} kind={kind} customerId={customerId} vehicleId={vehicleId} />
      {data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{(appt ? ["Date / time", "Customer", "Vehicle", "Concern", "Status"] : ["Work order", "Customer", "Vehicle", "Status", "Mileage in", "Technician", "Opened / created"]).map((label) => <th className="px-3 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.map((r) => {
        if (!r.id || !r.customer_id || !r.status) throw new Error("Job record is incomplete.");
        return <tr key={r.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-4"><Link className="font-bold text-red-700" href={`${base}/${r.id}`}>{"scheduled_start" in r ? formatTime(r.scheduled_start!) : r.work_order_number}</Link></td><td className="px-3 py-4"><Link href={`/customers/${r.customer_id}`}>{r.customer_name}</Link></td><td className="px-3 py-4">{r.vehicle_id ? <Link href={`/vehicles/${r.vehicle_id}`}>{r.vehicle_name || r.vin || "Vehicle details pending"}</Link> : "Not selected"}</td>{"scheduled_start" in r ? <td className="max-w-xs px-3 py-4"><p className="line-clamp-2">{r.customer_concern || "—"}</p></td> : null}<td className="px-3 py-4"><StatusBadge status={r.status} /></td>{"work_order_number" in r ? <><td className="px-3 py-4">{r.mileage_in?.toLocaleString("en-US") ?? "—"}</td><td className="px-3 py-4">{r.assigned_technician_id ? `Technician ${r.assigned_technician_id.slice(0, 8)}` : "Unassigned"}</td><td className="whitespace-nowrap px-3 py-4">{formatTime(r.opened_at || r.created_at!)}</td></> : null}</tr>;
      })}</tbody></table></div> : <EmptyState title={appt ? "No appointments found" : "No work orders found"} description="Try another filter, or create the first record for this view." />}
      <JobPagination base={base} query={{ q, status, ...(appt ? { period } : {}), ...(customerId ? { customerId } : {}), ...(vehicleId ? { vehicleId } : {}) }} page={page} count={count ?? 0} />
    </section></>;
}
