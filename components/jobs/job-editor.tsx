import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireShopContext } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/workshop/permissions";
import { getCustomer, getVehicle, workshopDb } from "@/lib/workshop/data";
import { appointmentWorkOrder, getAppointment, getWorkOrder, jobOptions } from "@/lib/jobs/data";
import { appointmentTransitions, workOrderTransitions } from "@/lib/jobs/status";
import { localDateTime } from "@/lib/jobs/time";
import { saveAppointment, saveWorkOrder } from "@/lib/jobs/actions";
import { JobForm } from "./job-form";

export async function JobEditor({ kind, id, prefill = {} }: { kind: "appointment" | "work-order"; id?: string; prefill?: { customerId?: string; vehicleId?: string; appointmentId?: string } }) {
  const context = await requireShopContext();
  const appt = kind === "appointment";
  const base = appt ? "/appointments" : "/work-orders";
  if (!canManageRecords(context.role)) redirect(id ? `${base}/${id}` : base);
  let initial: Record<string, string | number | null> = { customerId: "", vehicleId: "", appointmentId: "", assignedTechnicianId: "", mileageIn: "", mileageOut: "", customerComplaint: "", technicianNotes: "", customerConcern: "", internalNotes: "", scheduledStart: "", scheduledEnd: "", status: appt ? "confirmed" : "open" };
  let statuses: string[] = appt ? ["requested", "confirmed"] : ["draft", "open"];
  let linked = false;
  if (id && appt) {
    const record = await getAppointment(context.shop.id, id);
    linked = !!(await appointmentWorkOrder(context.shop.id, id));
    initial = { ...initial, ...record, scheduledStart: localDateTime(record.scheduledStart), scheduledEnd: record.scheduledEnd ? localDateTime(record.scheduledEnd) : "" };
    statuses = [record.status, ...(linked ? [] : appointmentTransitions[record.status])];
  } else if (id) {
    const record = await getWorkOrder(context.shop.id, id);
    if (["completed", "cancelled"].includes(record.status)) redirect(`${base}/${id}`);
    initial = { ...initial, ...record };
    const db = await workshopDb();
    const [repairs, estimates] = await Promise.all([db.from("work_order_services").select("id", { count: "exact", head: true }).eq("work_order_id", id), db.from("work_order_estimates").select("id", { count: "exact", head: true }).eq("work_order_id", id)]);
    if (repairs.error || estimates.error) throw new Error("Repair workflow temporarily unavailable.");
    statuses = [record.status, ...((repairs.count || estimates.count) ? [] : workOrderTransitions[record.status])];
  } else if (!appt && prefill.appointmentId) {
    const record = await getAppointment(context.shop.id, prefill.appointmentId);
    const existing = await appointmentWorkOrder(context.shop.id, record.id);
    if (existing) redirect(`/work-orders/${existing.id}`);
    if (!["requested", "confirmed", "checked_in"].includes(record.status)) redirect(`/appointments/${record.id}`);
    initial = { ...initial, customerId: record.customerId, vehicleId: record.vehicleId, appointmentId: record.id, customerComplaint: record.customerConcern };
  } else {
    if (prefill.customerId) initial.customerId = (await getCustomer(context.shop.id, prefill.customerId)).id;
    if (prefill.vehicleId) {
      const vehicle = await getVehicle(context.shop.id, prefill.vehicleId);
      if (initial.customerId && initial.customerId !== vehicle.customerId) notFound();
      initial = { ...initial, customerId: vehicle.customerId, vehicleId: vehicle.id, mileageIn: vehicle.mileage };
    }
  }
  const cancelHref = id ? `${base}/${id}` : initial.appointmentId ? `/appointments/${initial.appointmentId}` : base;
  return <><PageHeader eyebrow={context.shop.name} title={`${id ? "Edit" : "New"} ${appt ? "Appointment" : "Work Order"}`} description={appt ? "Schedule a visit for a customer and their vehicle." : "Capture the complaint and vehicle details to prepare a diagnosis-ready job."} /><JobForm kind={kind} initial={initial} options={await jobOptions(context.shop.id)} statuses={statuses} editing={!!id} linked={linked} action={appt ? saveAppointment.bind(null, id ?? null) : saveWorkOrder.bind(null, id ?? null)} cancelHref={cancelHref} /></>;
}
