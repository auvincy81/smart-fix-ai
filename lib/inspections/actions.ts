"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { getWorkOrder } from "@/lib/jobs/data";
import { getInspection } from "./data";
import { createInspectionSchema, findingsSchema, type WorkflowState } from "./validation";

function refresh() {
  for (const path of ["/inspections", "/work-orders", "/customers", "/vehicles"]) revalidatePath(path, "layout");
}
export async function createInspection(_state: WorkflowState, form: FormData): Promise<WorkflowState> {
  const context = await requireShopContext();
  const parsed = createInspectionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Review the work order, type, jurisdiction, and technician.", errors: parsed.error.flatten().fieldErrors };
  const value = parsed.data;
  const job = await getWorkOrder(context.shop.id, value.workOrderId);
  const db = await workshopDb();
  if (value.technicianId !== context.membership.id) {
    const techs = await db.rpc("list_shop_technicians", { p_shop_id: context.shop.id });
    if (techs.error || !techs.data.some((t) => t.id === value.technicianId)) return { message: "Choose a technician in this shop." };
  }
  const { data, error } = await db.rpc("create_inspection", { p_work_order: job.id, p_type: value.type, p_state: value.jurisdictionState, p_request_key: value.requestKey, p_technician: value.technicianId });
  if (error || !data) return { message: "Inspection could not be created. Review your access and try again." };
  refresh();
  redirect(`/inspections/${data}/edit?created=1`);
}
export async function saveInspection(input: unknown): Promise<WorkflowState> {
  const context = await requireShopContext();
  const parsed = findingsSchema.safeParse(input);
  if (!parsed.success) return { message: "Review conditions and text lengths before saving. Measurements allow 200 characters; notes and recommendations allow 5,000." };
  const value = parsed.data;
  await getInspection(context.shop.id, value.id);
  const db = await workshopDb();
  const { data, error } = await db.rpc("save_inspection", { p_id: value.id, p_updated_at: value.updatedAt, p_items: value.items, p_summary: value.summary, p_complete: value.complete, p_acknowledge_unchecked: value.acknowledgeUnchecked });
  if (error || !data) return { message: error?.code === "40001" ? "Someone updated this inspection. Reload to review their changes before saving your work." : error?.code === "22023" ? "Review the checklist and confirm any unchecked required items before completing. Completed inspections cannot be edited." : "Inspection could not be saved. Your entries remain here; try again." };
  refresh();
  return { id: data, message: value.complete ? "Inspection completed." : "Progress saved." };
}
