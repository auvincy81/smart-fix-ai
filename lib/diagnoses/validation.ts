import { z } from "zod";

const text = z.string().max(15000);
const strings = z.array(text).max(100);
export const diagnosisResponseSchema = z.object({
  summary: text, severity: z.enum(["stop_driving", "drive_to_shop", "monitor"]),
  likely_causes: z.array(z.object({ cause: text, probability: z.number().min(0).max(1), why: text })).max(100),
  quick_checks: strings, recommended_tests: strings, follow_up_questions: strings, safety_notes: strings,
  estimated_cost_range_usd: z.object({ low: z.number().finite(), high: z.number().finite(), notes: text }),
  vin_lookup: z.object({ vin: text, year: text, make: text, model: text, engine: text, trim: text, note: text }),
  dashboard_analysis: z.object({ detected_warning: text, meaning: text, urgency: text, next_steps: text, confidence_note: text }),
  part_analysis: z.object({ part_name: text, function: text, location: text, importance: text, replace_overview: text, caution_notes: text, confidence_note: text }),
});
export const saveDiagnosisSchema = z.object({ workOrderId: z.uuid(), saveKey: z.uuid(), symptoms: text, codes: text, response: diagnosisResponseSchema });
export const diagnosisNotesSchema = z.object({ id: z.uuid(), findings: z.string().trim().max(5000), confirmedCause: z.string().trim().max(5000) });
export const severityText = (value: string | null) => ({ stop_driving: "Stop Driving", drive_to_shop: "Drive to Shop Carefully", monitor: "Monitor" }[value ?? ""] ?? "Not specified");
