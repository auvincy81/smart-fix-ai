"use server";

import { revalidatePath } from "next/cache";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { workshopDb } from "@/lib/workshop/data";
import { decisionsSchema, repairSchemas, type RepairAction, type RepairState } from "./validation";

function refresh() {
  for (const path of ["/", "/work-orders", "/estimates", "/customers", "/vehicles", "/appointments"]) revalidatePath(path, "layout");
}
export async function repairAction(jobId: string, action: RepairAction, _state: RepairState, form: FormData): Promise<RepairState> {
  const context = await requireShopContext();
  await getWorkOrder(context.shop.id, jobId);
  const schema = repairSchemas[action];
  if (!schema) return { message: "This action is unavailable." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues.map((i) => `${i.path.join(" ")}: ${i.message}`).join(" ") };
  const db = await workshopDb();
  const { data, error } = await db.rpc("manage_repair", { p_job: jobId, p_action: action, p_data: parsed.data });
  if (error) return { message: error.code === "42501" ? "Your shop role cannot perform this action." : error.code === "22023" ? error.message : "Unable to save. Review the details, quantities, and same-shop references, then try again." };
  const token = data && typeof data === "object" && !Array.isArray(data) && typeof data.token === "string" ? data.token : undefined;
  refresh();
  return { success: true, message: token ? "Estimate ready for customer review. Copy this private link now; generating another invalidates the old link." : "Saved successfully.", token };
}
export async function recordStaffApproval(estimateId: string, input: unknown): Promise<RepairState> {
  const context = await requireShopContext();
  const parsed = decisionsSchema.safeParse(input);
  const method = input && typeof input === "object" && "method" in input ? input.method : undefined;
  if (!parsed.success || (method !== "phone" && method !== "in_person")) return { message: "Choose each repair, enter the customer's name, and acknowledge authorization." };
  const db = await workshopDb();
  const estimate = await db.from("work_order_estimates").select("id").eq("shop_id", context.shop.id).eq("id", estimateId).maybeSingle();
  if (!estimate.data || estimate.error) return { message: "Estimate unavailable." };
  const d = parsed.data;
  const { error } = await db.rpc("record_staff_approval", { p_estimate: estimateId, p_decisions: d.decisions, p_name: d.name, p_note: d.note, p_ack: d.acknowledge, p_method: method });
  if (error) return { message: "Authorization could not be recorded. Check your role and whether this estimate is still awaiting a response." };
  refresh();
  return { success: true, message: "Customer authorization recorded." };
}
