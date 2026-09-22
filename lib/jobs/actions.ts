"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import type { FormState } from "@/lib/workshop/validation";
import { appointmentSchema, workOrderSchema } from "./validation";
import { appointmentTransitions, workOrderTransitions, appointmentStatuses, workOrderStatuses } from "./status";
import { appointmentWorkOrder, getAppointment, getWorkOrder } from "./data";
import { z } from "zod";

function refreshJobs() {
  for (const path of ["/", "/appointments", "/work-orders", "/customers", "/vehicles"]) revalidatePath(path, "layout");
}
function safeError(code?: string): FormState {
  return { message: code === "22023" || code === "23503"
    ? "These details no longer match the job or its allowed status. Reload and review the customer, vehicle, appointment, and technician."
    : "We couldn't save this record. Please check your access and try again." };
}
export async function saveAppointment(id: string | null, _state: FormState, form: FormData): Promise<FormState> {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) return { message: "Your shop role allows viewing appointments only." };
  const key=z.uuid().safeParse(form.get("requestKey")); const version=String(form.get("updatedAt")||"");
  if ((!id && !key.success)||(id&&!version))return {message:"Reload this form before saving."};
  const parsed = appointmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Review the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (d.status === "cancelled" && form.get("confirmed") !== "yes") return { message: "Confirm cancellation before saving." };
  const db = await workshopDb();
  const customer = await db.from("customers").select("id").eq("shop_id", context.shop.id).eq("id", d.customerId).maybeSingle();
  if (customer.error || !customer.data) return { errors: { customerId: ["Choose a customer in this shop."] } };
  if (d.vehicleId) {
    const vehicle = await db.from("vehicles").select("id").eq("shop_id", context.shop.id).eq("customer_id", d.customerId).eq("id", d.vehicleId).maybeSingle();
    if (vehicle.error || !vehicle.data) return { errors: { vehicleId: ["Choose a vehicle belonging to this customer."] } };
  }
  const existing = id ? await getAppointment(context.shop.id, id) : null;
  if (existing && existing.updatedAt!==version)return {message:"This record changed after you opened the form. Reload and review before saving."};
  if (existing && (d.customerId !== existing.customerId || (d.status !== existing.status && !appointmentTransitions[existing.status].includes(d.status)))) return safeError("22023");
  if (!existing && d.status !== "requested" && d.status !== "confirmed") return safeError("22023");
  const values = { vehicle_id: d.vehicleId, scheduled_start: d.scheduledStart!, scheduled_end: d.scheduledEnd,
    customer_concern: d.customerConcern, internal_notes: d.internalNotes, status: d.status };
  const query = existing ? db.from("appointments").update(values).eq("id", existing.id).eq("shop_id", context.shop.id).eq("updated_at", version)
    : db.from("appointments").insert({ ...values, id:key.data, customer_id: d.customerId, shop_id: context.shop.id });
  const { data, error } = await query.select("id").single();
  if (!id && error?.code === "23505") { const old=await db.from("appointments").select("id").eq("id",key.data!).eq("shop_id",context.shop.id).maybeSingle();if(old.data)redirect(`/appointments/${old.data.id}`); }
  if (error || !data) return safeError(error?.code);
  refreshJobs();
  redirect(`/appointments/${data.id}?saved=1`);
}
export async function saveWorkOrder(id: string | null, _state: FormState, form: FormData): Promise<FormState> {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) return { message: "Your shop role allows viewing work orders only." };
  const key=z.uuid().safeParse(form.get("requestKey")); const version=String(form.get("updatedAt")||"");
  if ((!id && !key.success)||(id&&!version))return {message:"Reload this form before saving."};
  const parsed = workOrderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Review the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (d.status === "cancelled" && form.get("confirmed") !== "yes") return { message: "Confirm cancellation before saving." };
  const db = await workshopDb();
  const vehicle = await db.from("vehicles").select("id").eq("shop_id", context.shop.id).eq("customer_id", d.customerId).eq("id", d.vehicleId).maybeSingle();
  if (vehicle.error || !vehicle.data) return { errors: { vehicleId: ["Choose a vehicle belonging to this customer and shop."] } };
  const customer = await db.from("customers").select("id").eq("shop_id", context.shop.id).eq("id", d.customerId).maybeSingle();
  if (customer.error || !customer.data) return { errors: { customerId: ["Choose a customer in this shop."] } };
  if (d.assignedTechnicianId) {
    const techs = await db.rpc("list_shop_technicians", { p_shop_id: context.shop.id });
    if (techs.error || !techs.data.some((tech) => tech.id === d.assignedTechnicianId)) return { errors: { assignedTechnicianId: ["Choose an available shop technician."] } };
  }
  if (d.appointmentId) {
    const appt = await getAppointment(context.shop.id, d.appointmentId);
    if (appt.customerId !== d.customerId || (appt.vehicleId && appt.vehicleId !== d.vehicleId)) return safeError("22023");
    if (!id) {
      const linked = await appointmentWorkOrder(context.shop.id, appt.id);
      if (linked) redirect(`/work-orders/${linked.id}`);
    }
  }
  const existing = id ? await getWorkOrder(context.shop.id, id) : null;
  if (existing && existing.updatedAt!==version)return {message:"This record changed after you opened the form. Reload and review before saving."};
  if (existing && (d.customerId !== existing.customerId || d.vehicleId !== existing.vehicleId || d.appointmentId !== existing.appointmentId || (d.status !== existing.status && !workOrderTransitions[existing.status].includes(d.status)))) return safeError("22023");
  if (!existing && d.status !== "open" && d.status !== "draft") return safeError("22023");
  const values = { mileage_in: d.mileageIn, customer_complaint: d.customerComplaint, technician_notes: d.technicianNotes, assigned_technician_id: d.assignedTechnicianId, status: d.status };
  const query = existing ? db.from("work_orders").update({ ...values, mileage_out: d.mileageOut }).eq("id", existing.id).eq("shop_id", context.shop.id).eq("updated_at", version)
    : db.from("work_orders").insert({ ...values, id:key.data, shop_id: context.shop.id, customer_id: d.customerId, vehicle_id: d.vehicleId, appointment_id: d.appointmentId });
  const { data, error } = await query.select("id").single();
  if (error?.code === "23505" && d.appointmentId) {
    const linked = await appointmentWorkOrder(context.shop.id, d.appointmentId);
    if (linked) { refreshJobs(); redirect(`/work-orders/${linked.id}`); }
  }
  if (!id && error?.code === "23505") { const old=await db.from("work_orders").select("id").eq("id",key.data!).eq("shop_id",context.shop.id).maybeSingle();if(old.data)redirect(`/work-orders/${old.data.id}`); }
  if (error || !data) return safeError(error?.code);
  refreshJobs();
  redirect(`/work-orders/${data.id}?saved=1`);
}
export async function changeJobStatus(kind: "appointment" | "work-order", id: string, _state: FormState, form: FormData): Promise<FormState> {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) return { message: "Your shop role allows viewing records only." };
  if (form.get("status") === "cancelled" && form.get("confirmed") !== "yes") return { message: "Confirm cancellation before continuing." };
  const db = await workshopDb();
  if (kind === "appointment") {
    const status = z.enum(appointmentStatuses).safeParse(form.get("status"));
    const old = await getAppointment(context.shop.id, id);
    if (!status.success || !appointmentTransitions[old.status].includes(status.data)) return safeError("22023");
    const { data, error } = await db.from("appointments").update({ status: status.data }).eq("shop_id", context.shop.id).eq("id", id).eq("status", old.status).select("id").maybeSingle();
    if (error || !data) return safeError(error?.code);
  } else {
    const status = z.enum(workOrderStatuses).safeParse(form.get("status"));
    const old = await getWorkOrder(context.shop.id, id);
    if (!status.success || !workOrderTransitions[old.status].includes(status.data)) return safeError("22023");
    const { data, error } = await db.from("work_orders").update({ status: status.data }).eq("shop_id", context.shop.id).eq("id", id).eq("status", old.status).select("id").maybeSingle();
    if (error || !data) return safeError(error?.code);
  }
  refreshJobs();
  redirect(`/${kind === "appointment" ? "appointments" : "work-orders"}/${id}?updated=1`);
}
