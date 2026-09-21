import { z } from "zod";

export const conditions = ["good", "attention", "urgent", "not_checked"] as const;
export const inspectionTypes = ["multipoint", "pre_inspection"] as const;
export const states = "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI".split(" ");
export const readinessDisclaimer = "MekaReports Generic Readiness is a preparation aid, not an official inspection or certification. It is not a complete statement of any state's requirements. Final inspection decisions belong to the authorized inspection authority or station.";
export const typeLabel = (value: string | null) => value === "pre_inspection" ? "Pre-Inspection Readiness" : "Multi-Point Inspection";
export const resultLabel = (value: string | null) => ({ incomplete: "Incomplete", likely_ready: "Likely Ready", needs_attention: "Needs Attention", high_risk: "High Risk of Inspection Failure" }[value ?? ""] ?? "Not assessed");
export const createInspectionSchema = z.object({
  workOrderId: z.uuid(), type: z.enum(inspectionTypes), requestKey: z.uuid(),
  jurisdictionState: z.string().refine((v) => !v || states.includes(v), "Select a listed jurisdiction."),
  technicianId: z.uuid(),
});
export const findingsSchema = z.object({
  id: z.uuid(), updatedAt: z.iso.datetime({ offset: true }), summary: z.string().trim().max(5000),
  complete: z.boolean(), acknowledgeUnchecked: z.boolean(),
  items: z.array(z.object({ id: z.uuid(), condition: z.enum(conditions), measurement: z.string().trim().max(200), technician_note: z.string().trim().max(5000), recommendation: z.string().trim().max(5000) })).min(1).max(100),
});
export type FindingsInput = z.infer<typeof findingsSchema>;
export type WorkflowState = { message?: string; id?: string; errors?: Record<string, string[]> };
