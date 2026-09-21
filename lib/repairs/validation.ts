import { z } from "zod";

const text = z.string().trim().max(5000);
const id = z.union([z.uuid(), z.literal("")]).optional();
const decimal = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "Use a nonnegative amount with at most two decimals.");
const amount = z.union([decimal, z.literal("")]).optional();
const mileage = z.union([z.string().regex(/^\d{1,10}$/).refine((n) => Number(n) <= 2147483647), z.literal("")]).optional();
const date = z.union([z.iso.date(), z.literal("")]).optional();
export const repairSchemas = {
  recommend: z.object({ request_key: z.uuid(), title: text.min(1).max(500), description: text, priority: z.enum(["low", "medium", "high", "urgent"]), estimated_cost: amount, recommended_date: date, recommended_mileage: mileage, diagnosis_id: id, inspection_id: id, inspection_item_id: id }),
  future: z.object({ id: z.uuid(), recommended_date: date, recommended_mileage: mileage }),
  from_recommendation: z.object({ id: z.uuid() }),
  service: z.object({ id, request_key: id, description: text.min(1).max(500), customer_description: text, category: text.max(200), labor_hours: amount, labor_rate: amount, fees_amount: amount, technician_id: id, sort_order: z.coerce.number().int().min(0).max(9999).optional() }),
  part: z.object({ id, request_key: id, service_id: z.uuid(), part_name: text.min(1).max(500), part_number: text.max(200), description: text, quantity: z.string().regex(/^\d{1,7}(\.\d{1,3})?$/).refine((n) => Number(n) > 0), unit_price: decimal, unit_cost: amount }),
  draft: z.object({}), revise: z.object({}), present: z.object({}), approval_link: z.object({}),
  estimate_notes: z.object({ customer_note: text, internal_note: text }),
  start: z.object({ id: z.uuid() }), complete_service: z.object({ id: z.uuid(), completion_note: text.min(1) }),
  complete_job: z.object({ mileage_out: z.string().regex(/^\d{1,10}$/).refine((n) => Number(n) <= 2147483647) }),
};
export type RepairAction = keyof typeof repairSchemas;
export type RepairState = { message?: string; token?: string; success?: boolean };
export const decisionsSchema = z.object({
  decisions: z.array(z.object({ line: z.number().int().positive(), decision: z.enum(["approved", "declined"]) })).min(1).max(100),
  name: text.min(1).max(200), note: text, acknowledge: z.literal(true),
});
const money = z.string();
export const portalSchema = z.object({
  shop_name: z.string(), shop_phone: z.string().nullable(), shop_email: z.string().nullable(), customer_name: z.string(), vehicle: z.string(), vin: z.string().nullable(), mileage: z.number().nullable(), work_order: z.string(),
  estimate_number: z.string(), version: z.number(), status: z.string(), customer_note: z.string().nullable(),
  labor_total: money, parts_total: money, fees_total: money, grand_total: money, pre_tax: z.literal(true),
  request_status: z.string().optional(), expires_at: z.string().optional(),
  items: z.array(z.object({ line: z.number(), description: z.string(), category: z.string().nullable(), labor_hours: money, labor_rate: money, labor_amount: money, parts_amount: money, fees_amount: money, total_amount: money, decision: z.string(),
    parts: z.array(z.object({ name: z.string(), number: z.string().nullable(), quantity: money, unit_price: money, amount: money })) })),
});
export type PortalEstimate = z.infer<typeof portalSchema>;
export const moneyText = (value: number | string | null) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
export function sumMoney(values: string[]) {
  const cents = values.reduce((sum, value) => { const [whole, fraction = ""] = value.split("."); return sum + BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")); }, BigInt(0));
  return `${cents / BigInt(100)}.${(cents % BigInt(100)).toString().padStart(2, "0")}`;
}
