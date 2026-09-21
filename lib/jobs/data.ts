import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { workshopDb, customerOptions } from "@/lib/workshop/data";
import { recordId } from "@/lib/workshop/validation";
import type { Appointment, WorkOrder } from "@/types/mekareports";
import type { Tables } from "@/types/database";
import { appointmentStatuses, workOrderStatuses } from "./status";

export function toAppointment(r: Tables<"appointments">): Appointment {
  return { id: r.id, shopId: r.shop_id, customerId: r.customer_id, vehicleId: r.vehicle_id, scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end, customerConcern: r.customer_concern, internalNotes: r.internal_notes,
    status: z.enum(appointmentStatuses).parse(r.status), createdAt: r.created_at, updatedAt: r.updated_at };
}
export function toWorkOrder(r: Tables<"work_orders">): WorkOrder {
  return { id: r.id, shopId: r.shop_id, customerId: r.customer_id, vehicleId: r.vehicle_id, appointmentId: r.appointment_id,
    workOrderNumber: r.work_order_number, status: z.enum(workOrderStatuses).parse(r.status), mileageIn: r.mileage_in, mileageOut: r.mileage_out,
    customerComplaint: r.customer_complaint, technicianNotes: r.technician_notes, assignedTechnicianId: r.assigned_technician_id,
    openedAt: r.opened_at, completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at };
}
export async function getAppointment(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data, error } = await db.from("appointments").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (error) throw new Error("Appointments are temporarily unavailable.");
  if (!data) notFound();
  return toAppointment(data);
}
export async function getWorkOrder(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data, error } = await db.from("work_orders").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (error) throw new Error("Work orders are temporarily unavailable.");
  if (!data) notFound();
  return toWorkOrder(data);
}
export async function appointmentWorkOrder(shopId: string, appointmentId: string) {
  const db = await workshopDb();
  const { data, error } = await db.from("work_orders").select("id, work_order_number").eq("shop_id", shopId).eq("appointment_id", appointmentId).maybeSingle();
  if (error) throw new Error("Work orders are temporarily unavailable.");
  return data;
}
export type JobOptions = {
  customers: { id: string; label: string }[];
  vehicles: { id: string; customerId: string; label: string }[];
  technicians: { id: string; label: string }[];
  appointments: { id: string; customerId: string; vehicleId: string | null; label: string; concern: string | null }[];
};
export async function jobOptions(shopId: string): Promise<JobOptions> {
  const db = await workshopDb();
  const [customers, tech] = await Promise.all([customerOptions(shopId), db.rpc("list_shop_technicians", { p_shop_id: shopId })]);
  if (tech.error) throw new Error("Technicians are temporarily unavailable.");
  const vehicles: JobOptions["vehicles"] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("vehicles").select("id, customer_id, year, make, model, vin").eq("shop_id", shopId).order("id").range(offset, offset + 499);
    if (error) throw new Error("Vehicles are temporarily unavailable.");
    vehicles.push(...data.map((v) => ({ id: v.id, customerId: v.customer_id, label: [v.year, v.make, v.model, v.vin].filter(Boolean).join(" ") || "Vehicle details pending" })));
    if (data.length < 500) break;
  }
  const appointments: JobOptions["appointments"] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("appointments").select("id, customer_id, vehicle_id, scheduled_start, customer_concern")
      .eq("shop_id", shopId).in("status", ["requested", "confirmed", "checked_in"]).order("scheduled_start").order("id").range(offset, offset + 499);
    if (error) throw new Error("Appointments are temporarily unavailable.");
    appointments.push(...data.map((a) => ({ id: a.id, customerId: a.customer_id, vehicleId: a.vehicle_id, label: a.scheduled_start, concern: a.customer_concern })));
    if (data.length < 500) break;
  }
  return { customers, vehicles, technicians: tech.data, appointments };
}
