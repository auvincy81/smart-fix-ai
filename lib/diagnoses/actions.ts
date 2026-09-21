"use server";

import { revalidatePath } from "next/cache";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { workshopDb } from "@/lib/workshop/data";
import type { WorkflowState } from "@/lib/inspections/validation";
import { saveDiagnosisSchema, diagnosisNotesSchema } from "./validation";

function refresh() {
  for (const path of ["/diagnoses", "/work-orders", "/customers", "/vehicles"]) revalidatePath(path, "layout");
}
export async function saveDiagnosis(input: unknown): Promise<WorkflowState> {
  const context = await requireShopContext();
  const parsed = saveDiagnosisSchema.safeParse(input);
  if (!parsed.success || JSON.stringify(parsed.data).length > 250000) return { message: "The diagnosis result could not be validated. Run the diagnostic again before saving." };
  const value = parsed.data;
  const order = await getWorkOrder(context.shop.id, value.workOrderId);
  const db = await workshopDb();
  const { data, error } = await db.from("diagnoses").insert({ shop_id: context.shop.id, work_order_id: order.id, vehicle_id: order.vehicleId,
    technician_id: context.membership.id, symptoms: value.symptoms, diagnostic_codes: value.codes, ai_summary: value.response.summary,
    severity: value.response.severity, ai_response: value.response, save_key: value.saveKey }).select("id").single();
  if (error?.code === "23505") {
    const existing = await db.from("diagnoses").select("id").eq("shop_id", context.shop.id).eq("work_order_id", order.id).eq("save_key", value.saveKey).maybeSingle();
    if (existing.data) { refresh(); return { id: existing.data.id, message: "Diagnosis already saved to this work order." }; }
  }
  if (error || !data) return { message: "Diagnosis could not be saved. Your result remains here; try again." };
  refresh();
  return { id: data.id, message: "Diagnosis saved to work order." };
}
export async function saveDiagnosisNotes(input: unknown): Promise<WorkflowState> {
  const context = await requireShopContext();
  const parsed = diagnosisNotesSchema.safeParse(input);
  if (!parsed.success) return { message: "Use 5,000 characters or fewer in each field." };
  const db = await workshopDb();
  const { data, error } = await db.from("diagnoses").update({ technician_findings: parsed.data.findings || null, confirmed_cause: parsed.data.confirmedCause || null }).eq("shop_id", context.shop.id).eq("id", parsed.data.id).select("id").maybeSingle();
  if (error || !data) return { message: "Findings could not be saved. Check your access and try again." };
  refresh();
  return { id: data.id, message: "Technician findings saved." };
}
