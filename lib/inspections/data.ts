import "server-only";
import { notFound } from "next/navigation";
import { workshopDb } from "@/lib/workshop/data";
import { recordId } from "@/lib/workshop/validation";

export function recentCutoff(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 86400000).toISOString();
}

export async function getInspection(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data, error } = await db.from("inspections").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (error) throw new Error("Inspections are temporarily unavailable.");
  if (!data) notFound();
  return data;
}
export async function inspectionItems(id: string) {
  const db = await workshopDb();
  const { data, error } = await db.from("inspection_items").select("*").eq("inspection_id", id).order("sort_order").order("id");
  if (error) throw new Error("Inspection findings are temporarily unavailable.");
  return data;
}
export async function inspectionOptions(shopId: string, currentMember: { id: string; role: string }, selected?: string) {
  const db = await workshopDb();
  const result = await db.from("work_order_listing").select("id, work_order_number, customer_name, vehicle_name, assigned_technician_id").eq("shop_id", shopId).order("created_at", { ascending: false }).order("id").limit(250);
  if (result.error) throw new Error("Work orders are temporarily unavailable.");
  if (selected && !result.data.some(r => r.id === selected)) {
    const current = await db.from("work_order_listing").select("id, work_order_number, customer_name, vehicle_name, assigned_technician_id").eq("shop_id", shopId).eq("id", selected).maybeSingle();
    if (current.error) throw new Error("Work orders are temporarily unavailable.");
    if (current.data) result.data.push(current.data);
  }
  const orders = result.data.filter(r => r.id).map(r => ({ id: r.id!, label: `${r.work_order_number} · ${r.customer_name} · ${r.vehicle_name || "Vehicle details pending"}`, technicianId: r.assigned_technician_id }));
  const { data, error } = await db.rpc("list_shop_technicians", { p_shop_id: shopId });
  if (error) throw new Error("Technicians are temporarily unavailable.");
  return { orders, technicians: [{ id: currentMember.id, label: `Me (${currentMember.role.replaceAll("_", " ")})` }, ...data.filter((t) => t.id !== currentMember.id)] };
}
