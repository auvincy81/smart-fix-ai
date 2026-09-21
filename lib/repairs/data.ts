import "server-only";
import { notFound } from "next/navigation";
import { workshopDb } from "@/lib/workshop/data";
import { recordId } from "@/lib/workshop/validation";

export const partColumns = "id,shop_id,work_order_id,work_order_service_id,part_name,part_number,description,quantity,unit_price,amount,status,request_key,created_at,updated_at" as const;
export async function repairData(shopId: string, jobId: string) {
  const db = await workshopDb();
  const [services, parts, recommendations, estimates, audits] = await Promise.all([
    db.from("work_order_services").select("*").eq("shop_id", shopId).eq("work_order_id", jobId).order("sort_order").order("created_at").order("id"),
    db.from("work_order_parts").select(partColumns).eq("shop_id", shopId).eq("work_order_id", jobId).order("created_at"),
    db.from("service_recommendations").select("*").eq("shop_id", shopId).eq("work_order_id", jobId).order("created_at", { ascending: false }),
    db.from("work_order_estimates").select("*").eq("shop_id", shopId).eq("work_order_id", jobId).order("version", { ascending: false }),
    db.from("customer_approval_audits").select("*").eq("shop_id", shopId).eq("work_order_id", jobId).order("responded_at", { ascending: false }),
  ]);
  if (services.error || parts.error || recommendations.error || estimates.error || audits.error) throw new Error("Repair records are temporarily unavailable.");
  return { services: services.data, parts: parts.data, recommendations: recommendations.data, estimates: estimates.data, audits: audits.data };
}
export async function estimateData(shopId: string, id: string) {
  if (!recordId.safeParse(id).success) notFound();
  const db = await workshopDb();
  const estimate = await db.from("work_order_estimates").select("*").eq("shop_id", shopId).eq("id", id).maybeSingle();
  if (estimate.error) throw new Error("Estimate temporarily unavailable.");
  if (!estimate.data) notFound();
  const [items, audits] = await Promise.all([
    db.from("work_order_estimate_items").select("*").eq("estimate_id", id).order("line_number"),
    db.from("customer_approval_audits").select("*").eq("estimate_id", id).order("responded_at"),
  ]);
  if (items.error || audits.error) throw new Error("Estimate details temporarily unavailable.");
  return { estimate: estimate.data, items: items.data, audits: audits.data };
}
