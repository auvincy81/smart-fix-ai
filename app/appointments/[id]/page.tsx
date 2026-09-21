import { SendDocumentLink } from "@/components/documents/shop-documents";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Details, panel, primaryLink, secondaryLink, vehicleTitle } from "@/components/workshop/record-ui";
import { StatusBadge } from "@/components/jobs/job-ui";
import { StatusAction } from "@/components/jobs/status-actions";
import { requireShopContext } from "@/lib/auth/session";
import { getCustomer, getVehicle } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { appointmentWorkOrder, getAppointment } from "@/lib/jobs/data";
import { appointmentTransitions } from "@/lib/jobs/status";
import { formatTime } from "@/lib/jobs/time";

export default async function AppointmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; updated?: string }> }) {
  const context = await requireShopContext();
  const appointment = await getAppointment(context.shop.id, (await params).id);
  const [customer, vehicle, order] = await Promise.all([getCustomer(context.shop.id, appointment.customerId), appointment.vehicleId ? getVehicle(context.shop.id, appointment.vehicleId) : null, appointmentWorkOrder(context.shop.id, appointment.id)]);
  const feedback = await searchParams;
  const canEdit = canManageRecords(context.role);
  return <><Link className="mb-4 inline-block text-sm font-semibold text-slate-600" href="/appointments">← Appointments</Link><PageHeader eyebrow={context.shop.name} title="Appointment" description={`${formatTime(appointment.scheduledStart)} · America/New_York`} action={canEdit ? <Link className={secondaryLink} href={`/appointments/${appointment.id}/edit`}>Edit Appointment</Link> : undefined} />
    {(feedback.saved || feedback.updated) ? <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{feedback.updated ? "Status updated successfully." : "Appointment saved."}{appointment.status === "checked_in" ? " Check-in is complete. You can now create a work order." : ""}</p> : null}
    {canEdit && ["requested", "confirmed"].includes(appointment.status) ? <div className="mb-6"><SendDocumentLink kind="appointment_reminder" id={appointment.id} label="Send Appointment Reminder" /></div> : null}
    <div className="space-y-6"><section className={panel}><div className="mb-5 flex flex-wrap items-center gap-3"><StatusBadge status={appointment.status} />{canEdit && !order ? appointmentTransitions[appointment.status].map((status) => <StatusAction kind="appointment" id={appointment.id} status={status} key={status} />) : null}</div>
      <div className="mb-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase text-slate-500">Customer</p><Link className="mt-1 inline-block font-bold text-red-700" href={`/customers/${customer.id}`}>{customer.firstName} {customer.lastName}</Link></div><div><p className="text-xs font-bold uppercase text-slate-500">Vehicle</p>{vehicle ? <Link className="mt-1 inline-block font-bold text-red-700" href={`/vehicles/${vehicle.id}`}>{vehicleTitle(vehicle)}</Link> : <p className="mt-1 text-sm">Select a vehicle before creating a work order.</p>}</div></div>
      <Details entries={[["Scheduled start", formatTime(appointment.scheduledStart)], ["Scheduled end", appointment.scheduledEnd ? formatTime(appointment.scheduledEnd) : null], ["Customer concern", appointment.customerConcern], ["Internal notes", appointment.internalNotes]]} /></section>
      <section className={panel}><h2 className="mb-3 text-lg font-bold">Work Order</h2>{order ? <><Link className={primaryLink} href={`/work-orders/${order.id}`}>Open {order.work_order_number}</Link><p className="mt-3 text-sm text-slate-500">Manage service status in the linked work order.</p></> : canEdit && ["requested", "confirmed", "checked_in"].includes(appointment.status) ? <Link className={primaryLink} href={`/work-orders/new?appointmentId=${appointment.id}`}>Create Work Order</Link> : <p className="text-sm text-slate-500">No work order is linked to this appointment.</p>}</section></div></>;
}
