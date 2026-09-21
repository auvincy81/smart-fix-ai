import "server-only";
import { notFound } from "next/navigation";
import { workshopDb } from "@/lib/workshop/data";
import { approvalClient } from "@/lib/repairs/public";
import { documentSchema, type DocumentKind } from "./validation";
import { z } from "zod";

export async function publicDocument(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { data, error } = await approvalClient().rpc("read_customer_document", { p_token: token });
  if (error) throw new Error("Document temporarily unavailable.");
  const parsed = documentSchema.safeParse(data); return parsed.success ? parsed.data : null;
}
export async function previewDocument(kind: DocumentKind, id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { data, error } = await (await workshopDb()).rpc("preview_document", { p_kind: kind, p_id: id });
  if (error || !data) notFound();
  return documentSchema.parse(data);
}
export async function documentCustomer(kind: DocumentKind, id: string, shopId: string) {
  const db = await workshopDb(); let customerId: string | null = null; let jobId: string | null = null;
  if (["recommendation", "service_reminder"].includes(kind)) { const r = await db.from("service_recommendations").select("customer_id").eq("id", id).eq("shop_id", shopId).single(); customerId = r.data?.customer_id ?? null; }
  else if (kind === "appointment_reminder") { const r = await db.from("appointments").select("customer_id").eq("id", id).eq("shop_id", shopId).single(); customerId = r.data?.customer_id ?? null; }
  else {
    const table = kind === "repair_report" ? "repair_reports" : kind === "invoice" ? "work_order_invoices" : kind === "receipt" ? "work_order_receipts" : kind === "diagnosis" ? "diagnoses" : ["estimate", "approval_request"].includes(kind) ? "work_order_estimates" : "inspections";
    const r = await db.from(table).select("work_order_id").eq("id", id).eq("shop_id", shopId).single(); jobId = r.data?.work_order_id ?? null;
    if (jobId) { const j = await db.from("work_orders").select("customer_id").eq("id", jobId).eq("shop_id", shopId).single(); customerId = j.data?.customer_id ?? null; }
  }
  if (!customerId) notFound();
  const customer = await db.from("customers").select("id,email,phone").eq("id", customerId).eq("shop_id", shopId).single();
  if (!customer.data || customer.error) notFound(); return customer.data;
}
