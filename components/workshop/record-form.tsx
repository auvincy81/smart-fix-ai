"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/workshop/validation";

type Field = { name: string; label: string; required?: boolean; type?: string; maxLength?: number };
const contact: Field[] = [
  { name: "phone", label: "Phone", type: "tel", maxLength: 40 }, { name: "email", label: "Email", type: "email", maxLength: 254 },
  { name: "address", label: "Address", maxLength: 300 }, { name: "city", label: "City", maxLength: 100 },
  { name: "state", label: "State", maxLength: 100 }, { name: "postalCode", label: "ZIP / postal code", maxLength: 20 },
];
const fields: Record<"shop" | "customer" | "vehicle", Field[]> = {
  shop: [{ name: "name", label: "Shop name", required: true, maxLength: 160 }, ...contact],
  customer: [{ name: "firstName", label: "First name", required: true, maxLength: 160 }, { name: "lastName", label: "Last name", required: true, maxLength: 160 }, ...contact, { name: "notes", label: "Notes", type: "textarea", maxLength: 5000 }],
  vehicle: [{ name: "customerId", label: "Customer", required: true, type: "select" }, { name: "vin", label: "VIN", maxLength: 17 },
    { name: "year", label: "Year", type: "number" }, { name: "make", label: "Make", maxLength: 160 }, { name: "model", label: "Model", maxLength: 160 },
    { name: "trim", label: "Trim", maxLength: 160 }, { name: "engine", label: "Engine", maxLength: 160 },
    { name: "licensePlate", label: "License plate", maxLength: 30 }, { name: "plateState", label: "Plate state", maxLength: 100 },
    { name: "color", label: "Color", maxLength: 100 }, { name: "mileage", label: "Mileage", type: "number" },
    { name: "notes", label: "Notes", type: "textarea", maxLength: 5000 }],
};
const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100";

export function RecordForm({ kind, initial = {}, customers = [], action, cancelHref, submitLabel }: {
  kind: "shop" | "customer" | "vehicle"; initial?: Record<string, string | number | null>;
  customers?: { id: string; label: string }[];
  action: (state: FormState, form: FormData) => Promise<FormState>; cancelHref: string; submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields[kind].map(({ name }) => [name, String(initial[name] ?? "")])));
  const [decoding, setDecoding] = useState(false);
  const [vinNotice, setVinNotice] = useState("");

  async function decode() {
    const vin = values.vin.trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      setVinNotice("Enter a 17-character VIN without I, O, or Q. You can also enter vehicle details manually.");
      return;
    }
    setDecoding(true);
    setVinNotice("");
    try {
      const response = await fetch("/api/vehicles/decode-vin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin }) });
      const result: { data?: Record<string, string>; error?: string } = await response.json();
      if (!response.ok || !result.data) {
        setVinNotice(result.error ?? "VIN lookup is unavailable. Please enter vehicle details manually.");
        return;
      }
      const decoded = result.data;
      setValues((current) => ({ ...current, vin, ...Object.fromEntries(["year", "make", "model", "trim", "engine"].filter((key) => decoded[key]).map((key) => [key, decoded[key]])) }));
      setVinNotice(decoded.note || "Available VIN details filled in. Review and edit them before saving.");
    } catch {
      setVinNotice("VIN lookup is unavailable. Please enter vehicle details manually.");
    } finally {
      setDecoding(false);
    }
  }

  return (
    <form action={formAction} onReset={(event) => event.preventDefault()} className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="mb-6 text-sm text-slate-500">Fields marked * are required.</p>
      {state.message ? <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.message}</p> : null}
      <fieldset disabled={pending || decoding} className="grid gap-5 sm:grid-cols-2">
        {fields[kind].map((field) => {
          const errors = state.errors?.[field.name];
          const props = { id: field.name, name: field.name, required: field.required, value: values[field.name],
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [field.name]: event.target.value })),
            "aria-invalid": !!errors, "aria-describedby": errors ? `${field.name}-error` : undefined, className: inputClass };
          return (
            <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <label htmlFor={field.name} className="text-sm font-bold text-slate-700">{field.label}{field.required ? " *" : ""}</label>
              {field.type === "textarea" ? <textarea {...props} rows={4} maxLength={field.maxLength} />
                : field.type === "select" ? <select {...props}><option value="">Select a customer</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.label}</option>)}</select>
                  : <input {...props} type={field.type ?? "text"} maxLength={field.maxLength} min={field.name === "year" ? 1886 : field.type === "number" ? 0 : undefined} max={field.name === "year" ? 9999 : field.name === "mileage" ? 2147483647 : undefined} step={field.type === "number" ? 1 : undefined} />}
              {errors ? <p id={`${field.name}-error`} role="alert" className="mt-2 text-sm text-red-700">{errors.join(" ")}</p> : null}
              {field.name === "vin" ? <><button type="button" onClick={decode} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">{decoding ? "Decoding VIN…" : "Decode VIN"}</button><p role="status" className="mt-2 text-xs leading-5 text-slate-600">{vinNotice || "Optional. Decode with NHTSA or enter details manually."}</p></> : null}
            </div>
          );
        })}
      </fieldset>
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
        <button disabled={pending || decoding} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{pending ? "Saving…" : submitLabel}</button>
        <Link href={cancelHref} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</Link>
      </div>
    </form>
  );
}
