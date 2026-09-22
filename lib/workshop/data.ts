import "server-only";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { Customer, Vehicle } from "@/types/mekareports";
import { recordId } from "./validation";

export function toCustomer(row: Tables<"customers">): Customer {
  return { id: row.id, shopId: row.shop_id, firstName: row.first_name, lastName: row.last_name,
    phone: row.phone, email: row.email, address: row.address, city: row.city, state: row.state,
    postalCode: row.postal_code, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function toVehicle(row: Tables<"vehicles">): Vehicle {
  return { id: row.id, shopId: row.shop_id, customerId: row.customer_id, vin: row.vin,
    year: row.year, make: row.make, model: row.model, trim: row.trim, engine: row.engine,
    licensePlate: row.license_plate, plateState: row.plate_state, color: row.color,
    mileage: row.mileage, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function workshopDb() {
  const db = await createServerSupabaseClient();
  if (!db) throw new Error("Shop records are temporarily unavailable.");
  return db;
}
export async function getCustomer(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data, error } = await db.from("customers").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (error) throw new Error("Customer records are temporarily unavailable.");
  if (!data) notFound();
  return toCustomer(data);
}
export async function getVehicle(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const { data, error } = await db.from("vehicles").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (error) throw new Error("Vehicle records are temporarily unavailable.");
  if (!data) notFound();
  return toVehicle(data);
}
export async function customerOptions(shopId: string, selected?: string) {
  const db = await workshopDb();
  const { data, error } = await db.from("customers").select("id, first_name, last_name")
    .eq("shop_id", shopId).order("updated_at", { ascending: false }).order("id").limit(250);
  if (error) throw new Error("Customer records are temporarily unavailable.");
  if (selected && !data.some(row => row.id === selected)) {
    const current = await db.from("customers").select("id, first_name, last_name").eq("shop_id", shopId).eq("id", selected).maybeSingle();
    if (current.error) throw new Error("Customer records are temporarily unavailable.");
    if (current.data) data.push(current.data);
  }
  return data.map(row => ({ id: row.id, label: `${row.first_name} ${row.last_name}` }));
}
export function searchParams(query: { q?: string; page?: string }) {
  // Keep PostgREST filter syntax out of user input, and bound request size.
  const q = (query.q ?? "").slice(0, 100).replace(/[^\p{L}\p{N}@+ ._\-]/gu, "").trim();
  const parsedPage = Number(query.page);
  const page = Number.isSafeInteger(parsedPage) ? Math.min(100000, Math.max(1, parsedPage)) : 1;
  const pattern = `%${q.replace(/_/g, "\\_")}%`;
  return { q, page, pattern, start: (page - 1) * 25, end: page * 25 - 1 };
}
