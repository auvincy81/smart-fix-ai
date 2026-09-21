"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAuthenticatedUser, requireShopContext } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageRecords } from "./permissions";
import { customerSchema, vehicleSchema, shopSchema, recordId, type FormState } from "./validation";

export async function createShop(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentAuthenticatedUser();
  if (!user.ok || !user.data) redirect("/login");
  const parsed = shopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Please review the highlighted fields." };
  const db = await createServerSupabaseClient();
  if (!db) return { message: "Account services are temporarily unavailable." };
  const d = parsed.data;
  const { error } = await db.rpc("create_initial_shop", {
    p_name: d.name, p_phone: d.phone ?? undefined, p_email: d.email ?? undefined,
    p_address: d.address ?? undefined, p_city: d.city ?? undefined, p_state: d.state ?? undefined, p_postal_code: d.postalCode ?? undefined,
  });
  if (error) {
    if (error.code === "23505") redirect("/customers");
    return { message: "We couldn't set up your shop. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/customers");
}

export async function saveCustomer(id: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) return { message: "Your shop role allows viewing records only." };
  if (id && !recordId.safeParse(id).success) return { message: "Customer not found." };
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Please review the highlighted fields." };
  const db = await createServerSupabaseClient();
  if (!db) return { message: "Customer records are temporarily unavailable." };
  const d = parsed.data;
  const values = { first_name: d.firstName, last_name: d.lastName, phone: d.phone, email: d.email,
    address: d.address, city: d.city, state: d.state, postal_code: d.postalCode, notes: d.notes };
  const query = id
    ? db.from("customers").update(values).eq("id", id).eq("shop_id", context.shop.id)
    : db.from("customers").insert({ ...values, shop_id: context.shop.id });
  const { data, error } = await query.select("id").single();
  if (error || !data) return { message: "We couldn't save this customer. Check your access and try again." };
  revalidatePath("/customers", "layout");
  revalidatePath("/vehicles", "layout");
  redirect(`/customers/${data.id}`);
}

export async function saveVehicle(id: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  const context = await requireShopContext();
  if (!canManageRecords(context.role)) return { message: "Your shop role allows viewing records only." };
  if (id && !recordId.safeParse(id).success) return { message: "Vehicle not found." };
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Please review the highlighted fields." };
  const db = await createServerSupabaseClient();
  if (!db) return { message: "Vehicle records are temporarily unavailable." };
  const d = parsed.data;
  const customer = await db.from("customers").select("id").eq("id", d.customerId).eq("shop_id", context.shop.id).maybeSingle();
  if (customer.error || !customer.data) return { errors: { customerId: ["Choose an available customer in your shop."] } };
  const values = { customer_id: d.customerId, vin: d.vin, year: d.year, make: d.make, model: d.model,
    trim: d.trim, engine: d.engine, license_plate: d.licensePlate, plate_state: d.plateState,
    color: d.color, mileage: d.mileage, notes: d.notes };
  const query = id
    ? db.from("vehicles").update(values).eq("id", id).eq("shop_id", context.shop.id)
    : db.from("vehicles").insert({ ...values, shop_id: context.shop.id });
  const { data, error } = await query.select("id").single();
  if (error || !data) return error?.code === "23505"
    ? { errors: { vin: ["This VIN already belongs to a vehicle in your shop."] } }
    : { message: "We couldn't save this vehicle. Check your access and try again." };
  revalidatePath("/vehicles", "layout");
  revalidatePath("/customers", "layout");
  redirect(`/vehicles/${data.id}`);
}
