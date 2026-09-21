import { z } from "zod";
import { appointmentStatuses, workOrderStatuses } from "./status";
import { toInstant } from "./time";

const optionalId = z.union([z.uuid(), z.literal("")]).transform((value) => value || null);
const text = z.string().trim().max(5000, "Use 5,000 characters or fewer.").transform((value) => value || null);
const time = z.string().transform(toInstant).refine((value) => value !== null, "Enter a valid New York date and time.");
export const appointmentSchema = z.object({
  customerId: z.uuid("Choose a customer."), vehicleId: optionalId,
  scheduledStart: time, scheduledEnd: z.union([z.literal("").transform(() => null), time]),
  customerConcern: text, internalNotes: text, status: z.enum(appointmentStatuses),
}).refine((value) => !value.scheduledEnd || !value.scheduledStart || value.scheduledEnd >= value.scheduledStart, { path: ["scheduledEnd"], message: "End must be at or after the start." });
const mileage = z.union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(2147483647)]);
export const workOrderSchema = z.object({
  customerId: z.uuid("Choose a customer."), vehicleId: z.uuid("Choose a vehicle."), appointmentId: optionalId,
  assignedTechnicianId: optionalId, mileageIn: mileage, mileageOut: mileage,
  customerComplaint: text, technicianNotes: text, status: z.enum(workOrderStatuses),
}).refine((value) => value.mileageIn === null || value.mileageOut === null || value.mileageOut >= value.mileageIn, { path: ["mileageOut"], message: "Mileage out cannot be less than mileage in." });
