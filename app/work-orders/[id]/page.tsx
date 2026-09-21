import { JobDocuments } from "@/components/documents/shop-documents";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Details, panel, secondaryLink, vehicleTitle } from "@/components/workshop/record-ui";
import { ClinicalHistory } from "@/components/jobs/clinical-history";
import { RepairWorkspace } from "@/components/repairs/workspace";
import { StatusBadge } from "@/components/jobs/job-ui";
import { StatusAction } from "@/components/jobs/status-actions";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer, getVehicle, workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { getAppointment, getWorkOrder } from "@/lib/jobs/data";
import { workOrderTransitions } from "@/lib/jobs/status";
import { formatTime } from "@/lib/jobs/time";

export default async function WorkOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; updated?: string }> }) {
  const context = await requireShopContext();
  const order = await getWorkOrder(context.shop.id, (await params).id);
  const [customer, vehicle, appointment] = await Promise.all([getCustomer(context.shop.id, order.customerId), getVehicle(context.shop.id, order.vehicleId), order.appointmentId ? getAppointment(context.shop.id, order.appointmentId) : null]);
  const feedback = await searchParams;
  const canEdit = canManageRecords(context.role) && !["completed", "cancelled"].includes(order.status);
  const db = await workshopDb();
  const [repairs, estimates] = await Promise.all([db.from("work_order_services").select("id", { count: "exact", head: true }).eq("work_order_id", order.id), db.from("work_order_estimates").select("id", { count: "exact", head: true }).eq("work_order_id", order.id)]);
  if (repairs.error || estimates.error) throw new Error("Repair workflow temporarily unavailable.");
  const repairWorkflow = !!(repairs.count || estimates.count);
  return <><Link className="mb-4 inline-block text-sm font-semibold text-slate-600" href="/work-orders">← Work Orders</Link><PageHeader eyebrow={context.shop.name} title={order.workOrderNumber} description={`Opened / created ${formatTime(order.openedAt || order.createdAt)}`} action={canEdit ? <Link className={secondaryLink} href={`/work-orders/${order.id}/edit`}>Edit Work Order</Link> : undefined} />
    {(feedback.saved || feedback.updated) ? <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{feedback.updated ? "Status updated successfully." : "Work order saved."}</p> : null}
    <section className={`${panel} mb-6`}><div className="flex flex-wrap items-center gap-3"><StatusBadge status={order.status} />{canEdit && !repairWorkflow ? workOrderTransitions[order.status].map((status) => <StatusAction kind="work-order" id={order.id} status={status} key={status} />) : null}</div>{repairWorkflow ? <p className="mt-3 text-sm text-slate-500">Customer decisions and approved repair completion control this job&apos;s status.</p> : null}</section>
    <div className="grid gap-6 lg:grid-cols-2"><section className={panel}><h2 className="mb-3 text-lg font-bold">Customer</h2><Link className="mb-4 inline-block font-bold text-red-700" href={`/customers/${customer.id}`}>{customer.firstName} {customer.lastName}</Link><Details entries={[["Phone", customer.phone], ["Email", customer.email]]} /></section>
      <section className={panel}><h2 className="mb-3 text-lg font-bold">Vehicle</h2><Link className="mb-4 inline-block font-bold text-red-700" href={`/vehicles/${vehicle.id}`}>{vehicleTitle(vehicle)}</Link><Details entries={[["VIN", vehicle.vin], ["Mileage in", order.mileageIn], ["Mileage out", order.mileageOut]]} /></section>
      <section className={`${panel} lg:col-span-2`}><h2 className="mb-4 text-lg font-bold">Job</h2>{appointment ? <Link className="mb-4 inline-block font-bold text-red-700" href={`/appointments/${appointment.id}`}>Appointment: {formatTime(appointment.scheduledStart)}</Link> : <p className="mb-4 text-sm text-slate-500">Walk-in job · no linked appointment</p>}<Details entries={[["Customer complaint", order.customerComplaint], ["Technician notes", order.technicianNotes], ["Assigned technician", order.assignedTechnicianId ? `Technician ${order.assignedTechnicianId.slice(0, 8)}` : "Unassigned"], ["Completed", order.completedAt ? formatTime(order.completedAt) : null]]} /></section>
      <div className="lg:col-span-2"><ClinicalHistory shopId={context.shop.id} workOrderId={order.id} vehicleId={vehicle.id} /></div>
      <div className="lg:col-span-2"><RepairWorkspace shopId={context.shop.id} job={order} manage={canManageRecords(context.role)} memberId={context.membership.id} /></div>
      <div className="lg:col-span-2"><JobDocuments shopId={context.shop.id} jobId={order.id} completed={order.status === "completed"} manage={canManageRecords(context.role)} /></div>
    </div></>;
}
