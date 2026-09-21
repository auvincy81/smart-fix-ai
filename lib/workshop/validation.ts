import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`).transform((value) => value || null);
const requiredName = z.string().trim().min(1, "This field is required.").max(160, "Use 160 characters or fewer.");
const contact = {
  phone: optionalText(40),
  email: z.string().trim().max(254).pipe(z.union([z.email("Enter a valid email address."), z.literal("")])).transform((value) => value || null),
  address: optionalText(300), city: optionalText(100), state: optionalText(100), postalCode: optionalText(20),
};
export const shopSchema = z.object({ name: requiredName, ...contact });
export const customerSchema = z.object({ firstName: requiredName, lastName: requiredName, ...contact, notes: optionalText(5000) });
const optionalInteger = (min: number, max: number) => z.union([
  z.literal("").transform(() => null),
  z.coerce.number().int("Enter a whole number.").min(min).max(max),
]);
export const vehicleSchema = z.object({
  customerId: z.uuid("Choose a customer from this shop."),
  vin: z.string().trim().toUpperCase().refine((value) => !value || /^[A-HJ-NPR-Z0-9]{17}$/.test(value), "Enter a 17-character VIN without I, O, or Q, or leave it blank.").transform((value) => value || null),
  year: optionalInteger(1886, 9999), make: optionalText(160), model: optionalText(160),
  trim: optionalText(160), engine: optionalText(160), licensePlate: optionalText(30),
  plateState: optionalText(100), color: optionalText(100), mileage: optionalInteger(0, 2147483647), notes: optionalText(5000),
});
export const recordId = z.uuid();

export type FormState = { message?: string; errors?: Record<string, string[]> };
