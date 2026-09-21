"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { canManageRecords } from "@/lib/workshop/permissions";
import { emailProvider } from "@/lib/communications/providers";
import { communicationSchema, documentKind, paymentSchema, type DocumentState } from "./validation";

function refresh() { for (const path of ["/reports", "/invoices", "/receipts", "/work-orders", "/customers", "/vehicles", "/communications", "/service-reminders"]) revalidatePath(path, "layout"); }
async function manager() { const context = await requireShopContext(); return canManageRecords(context.role); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export async function documentAction(kind: string, id: string, action: string, _state: DocumentState, form: FormData): Promise<DocumentState> {
  if (!await manager()) return { message: "Your shop role cannot manage customer documents." };
  if (!z.uuid().safeParse(id).success || !["repair_report", "invoice"].includes(kind) || !["create", "finalize", "issue", "payment", "void"].includes(action)) return { message: "Document action unavailable." };
  const parsed = action === "payment" ? paymentSchema.safeParse(Object.fromEntries(form)) : z.object({}).safeParse({});
  if (!parsed.success) return { message: "Review the payment amount, method, and reference. Do not enter card or banking credentials." };
  const { data, error } = await (await workshopDb()).rpc("manage_document", { p_kind: kind, p_id: id, p_action: action, p_data: parsed.data });
  if (error) return { message: error.code === "22023" ? error.message : action === "payment" && error.code === "23514" ? "Review the payment details. References must contain transaction IDs only; never card or banking credentials." : "Unable to save this document. Refresh and review its current status." };
  const result = record(data); refresh();
  return { success: true, message: "Saved successfully.", id: String(result.id), receiptId: typeof result.receipt_id === "string" ? result.receipt_id : undefined };
}
export async function shareDocument(kind: string, id: string): Promise<DocumentState> {
  if (!await manager() || !documentKind.safeParse(kind).success || !z.uuid().safeParse(id).success) return { message: "Document unavailable." };
  const { data, error } = await (await workshopDb()).rpc("create_document_link", { p_kind: kind, p_id: id });
  if (error) return { message: "Unable to share this document in its current state." };
  const result = record(data); refresh(); return { success: true, token: String(result.token), id: String(result.id), path: `/documents/${result.token}`, message: "Private snapshot link created. It expires in 30 days." };
}
export async function revokeLink(id: string): Promise<DocumentState> {
  if (!await manager() || !z.uuid().safeParse(id).success) return { message: "Link unavailable." };
  const { error } = await (await workshopDb()).rpc("revoke_document_link", { p_id: id }); refresh();
  return error ? { message: "Unable to revoke link." } : { success: true, message: "Link revoked." };
}
export async function prepareCommunication(input: unknown): Promise<DocumentState> {
  if (!await manager()) return { message: "Your role cannot send customer messages." };
  const parsed = communicationSchema.safeParse(input);
  if (!parsed.success) return { message: "Review the document, channel, recipient, and message." };
  const d = parsed.data;
  const { data, error } = await (await workshopDb()).rpc("prepare_communication", { p_kind: d.kind, p_id: d.id, p_channel: d.channel, p_recipient: d.recipient, p_message: d.message, p_request: d.request });
  if (error) return { message: error.code === "22023" ? error.message : "Unable to prepare this message." };
  const result = record(data); refresh();
  return { success: true, id: String(result.id), token: typeof result.token === "string" ? result.token : undefined, path: typeof result.path === "string" ? result.path : undefined, message: result.existing ? "This draft already exists in history. Prepare a new preview if its private link was lost." : "Draft saved. Verify the recipient and preview before sending." };
}
export async function sendCommunication(id: string, token: string): Promise<DocumentState> {
  if (!await manager() || !z.uuid().safeParse(id).success || !/^[0-9a-f]{64}$/.test(token)) return { message: "Message unavailable." };
  const db = await workshopDb();
  const { data, error } = await db.rpc("claim_communication", { p_id: id, p_token: token });
  if (error) return { message: error.code === "22023" ? error.message : "Unable to send this message." };
  const claim = record(data);
  if (claim.unconfigured) { refresh(); return { message: "SMS provider not configured. Draft saved; no message was sent." }; }
  const host = (await headers()).get("host") || "";
  const configured = process.env.MEKAREPORTS_PUBLIC_ORIGIN;
  let origin = "";
  try { const url = new URL(configured || `http://${host}`); if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "127.0.0.2"].includes(url.hostname))) origin = url.origin; } catch { /* Invalid origin must not create an outbound link. */ }
  const result = origin ? await emailProvider.send({ id, recipient: String(claim.recipient), subject: String(claim.subject), text: `${claim.message}\n\nView your private document:\n${origin}${claim.path}\n\nLocal development message captured in Mailpit; not internet delivery.` }) : { ok: false as const };
  const finished = await db.rpc("finish_communication", { p_id: id, p_attempt: String(claim.attempt), p_success: result.ok, p_provider_id: result.ok ? result.providerId : "" });
  refresh();
  if (finished.error) return { message: "Delivery status could not be saved. Check Mailpit and communication history before retrying; this attempt remains queued." };
  return { success: result.ok, message: result.ok ? "Email captured in local Mailpit. This is not internet email delivery." : "Local email was not confirmed. Check Mailpit before preparing another message." };
}
