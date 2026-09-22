"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";

export type FeedbackState = { message?: string; saved?: boolean };
export async function submitFeedback(_state: FeedbackState, form: FormData): Promise<FeedbackState> {
  const context = await requireShopContext();
  const parsed = z.object({ id: z.uuid(), category: z.enum(["bug","confusing","feature_request","other"]), message: z.string().trim().min(5).max(2000), path: z.string().max(200) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Choose a category and describe the problem in 5–2,000 characters." };
  const value = parsed.data;
  const path = value.path.split(/[?#]/)[0].replace(/^\/(documents|approve)\/.*$/, "/$1/[private-link]");
  if (!path.startsWith("/") || path.startsWith("//")) return { message: "Use an app page path beginning with /." };
  const db = await workshopDb();
  const { error } = await db.from("beta_feedback").insert({ ...value, path, shop_id: context.shop.id, user_id: context.user.id });
  if (error?.code === "23505") {
    const previous = await db.from("beta_feedback").select("id").eq("id",value.id).eq("shop_id",context.shop.id).eq("user_id",context.user.id).maybeSingle();
    if (previous.data) return { saved: true, message: "Feedback already saved. Thank you." };
  }
  if (error) return { message: "Feedback could not be saved. Your text remains here; try again." };
  revalidatePath("/feedback"); return { saved: true, message: "Feedback saved to your shop's local beta inbox. Thank you." };
}
export async function reviewFeedback(id: string, form: FormData) {
  const context = await requireShopContext();
  const status = z.enum(["new","reviewed","resolved"]).safeParse(form.get("status"));
  if (!canManageRecords(context.role) || !z.uuid().safeParse(id).success || !status.success) return;
  const { error } = await (await workshopDb()).from("beta_feedback").update({status:status.data}).eq("id",id).eq("shop_id",context.shop.id);
  if (error) throw new Error("Feedback status could not be saved. Please try again.");
  revalidatePath("/feedback");
}
