import { z } from "zod";

export const documentKinds = ["repair_report", "invoice", "receipt", "inspection", "pre_inspection", "diagnosis", "estimate", "recommendation", "service_reminder", "appointment_reminder", "approval_request"] as const;
export const documentKind = z.enum(documentKinds);
export type DocumentKind = z.infer<typeof documentKind>;
export const documentSchema = z.object({
  kind: z.string(), title: z.string(), number: z.string(), status: z.string(), as_of: z.string(),
  context: z.object({ shop: z.string(), contact: z.string(), customer: z.string(), vehicle: z.string(), vin: z.string(), work_order: z.string(), mileage_in: z.string(), mileage_out: z.string() }),
  sections: z.array(z.object({ title: z.string(), rows: z.array(z.object({ label: z.string(), value: z.string() })) })),
});
export type CustomerDocument = z.infer<typeof documentSchema>;
export type DocumentState = { message?: string; success?: boolean; id?: string; receiptId?: string; token?: string; path?: string };
export const paymentSchema = z.object({ amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), method: z.enum(["cash", "card", "check", "bank_transfer", "other"]), payment_reference: z.string().trim().max(80), note: z.string().trim().max(500), request_key: z.uuid() });
export const communicationSchema = z.object({ kind: documentKind, id: z.uuid(), channel: z.enum(["email", "sms"]), recipient: z.string().trim().min(3).max(254).refine((s) => !/[\r\n]/.test(s)), message: z.string().trim().max(2000), request: z.uuid() });
