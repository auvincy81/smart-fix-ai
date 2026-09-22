"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState } from "react";
import type { FormState } from "@/lib/workshop/validation";
import type { JobOptions } from "@/lib/jobs/data";
import { statusLabel } from "@/lib/jobs/status";
import { formatTime } from "@/lib/jobs/time";
import { primaryLink, secondaryLink } from "@/components/workshop/record-ui";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:bg-slate-100";
export function JobForm({ kind, initial, options, statuses, editing = false, linked = false, action, cancelHref, requestKey }: {
  requestKey: string; kind: "appointment" | "work-order"; initial: Record<string, string | number | null>; options: JobOptions;
  statuses: string[]; editing?: boolean; linked?: boolean; action: (state: FormState, form: FormData) => Promise<FormState>; cancelHref: string;
}) {
  const router = useRouter();
  const [createKey]=useState(requestKey);
  const [version]=useState(initial.updatedAt??"");
  const [state, formAction, pending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, String(value ?? "")])));
  const set = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
  const isAppointment = kind === "appointment";
  const fields = isAppointment ? [
    ["scheduledStart", "Scheduled start (New York time) *", "datetime-local"], ["scheduledEnd", "Scheduled end (New York time)", "datetime-local"],
    ["customerConcern", "Customer concern", "textarea"], ["internalNotes", "Internal notes", "textarea"],
  ] : [
    ["mileageIn", "Mileage in", "number"], ...(editing ? [["mileageOut", "Mileage out", "number"]] : []),
    ["customerComplaint", "Customer complaint", "textarea"], ["technicianNotes", "Technician notes", "textarea"],
  ];
  function fieldError(name: string) {
    return state.errors?.[name] ? <p id={`${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{state.errors[name].join(" ")}</p> : null;
  }
  function select(name: string, label: string, choices: { id: string; label: string }[], required: boolean, locked = false) {
    return <div><label htmlFor={name} className="text-sm font-bold text-slate-700">{label}</label>
      {locked ? <input type="hidden" name={name} value={values[name] ?? ""} /> : null}
      <select id={name} name={locked ? undefined : name} value={values[name] ?? ""} required={required} disabled={locked} className={inputClass}
        aria-invalid={!!state.errors?.[name]} aria-describedby={state.errors?.[name] ? `${name}-error` : undefined}
        onChange={(event) => {
          const value = event.target.value;
          if (name === "customerId") setValues((old) => ({ ...old, customerId: value, vehicleId: "" }));
          else if (name === "appointmentId") {
            const appt = options.appointments.find((a) => a.id === value);
            setValues((old) => ({ ...old, appointmentId: value, ...(appt ? { customerId: appt.customerId, vehicleId: appt.vehicleId ?? "", customerComplaint: appt.concern ?? "" } : {}) }));
          } else set(name, value);
        }}><option value="">{required ? "Select an option" : "Not selected"}</option>{choices.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select>{fieldError(name)}</div>;
  }
  const chosenAppointment = options.appointments.find((a) => a.id === values.appointmentId);
  return <form method="post" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Retain native select values after a failed action; React's automatic form
    // reset can otherwise clear the displayed choice while state still holds it.
    startTransition(() => formAction(form));
  }} className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
    <input type="hidden" name="requestKey" value={createKey}/><input type="hidden" name="updatedAt" value={version}/>
    <p className="mb-5 text-sm text-slate-500">Fields marked * are required. {isAppointment ? "Scheduling uses America/New_York, including daylight saving time." : "A work order number is assigned when you save."}</p>
    {state.message ? <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{state.message}</p> : null}
    <p className="mb-4 text-sm text-slate-600">Choices show recent records. For an older customer, vehicle, or appointment, find its detail page and start the job there.</p><fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
      {!isAppointment && !editing ? select("appointmentId", "Appointment (optional)", options.appointments.map((a) => ({ id: a.id, label: `${formatTime(a.label)} · ${options.customers.find((c) => c.id === a.customerId)?.label ?? "Customer"}` })), false) : <input type="hidden" name="appointmentId" value={values.appointmentId ?? ""} />}
      {select("customerId", "Customer *", options.customers, true, editing || !!values.appointmentId)}
      {select("vehicleId", isAppointment ? "Vehicle (optional)" : "Vehicle *", options.vehicles.filter((v) => v.customerId === values.customerId), !isAppointment, (editing && !isAppointment) || linked || !!chosenAppointment?.vehicleId)}
      <div className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
        <Link href="/customers/new" target="_blank" rel="noopener noreferrer" className="font-bold text-red-700">Add Customer ↗</Link>
        {values.customerId ? <Link href={`/vehicles/new?customerId=${values.customerId}`} target="_blank" rel="noopener noreferrer" className="font-bold text-red-700">Add Vehicle ↗</Link> : null}
        <button type="button" onClick={() => router.refresh()} className="font-semibold text-slate-600 underline">Refresh choices</button>
        <p className="w-full text-xs text-slate-500">Add records in a new tab, then refresh choices here. Your entries stay in this form.</p>
      </div>
      {fields.map(([name, label, type]) => <div key={name} className={type === "textarea" ? "sm:col-span-2" : ""}>
        <label htmlFor={name} className="text-sm font-bold text-slate-700">{label}</label>
        {type === "textarea" ? <textarea id={name} name={name} rows={3} maxLength={5000} value={values[name] ?? ""} onChange={(event) => set(name, event.target.value)} className={inputClass} aria-invalid={!!state.errors?.[name]} aria-describedby={state.errors?.[name] ? `${name}-error` : undefined} />
          : <input id={name} name={name} type={type} required={name === "scheduledStart"} min={type === "number" ? 0 : undefined} max={type === "number" ? 2147483647 : undefined} step={type === "number" ? 1 : undefined} value={values[name] ?? ""} onChange={(event) => set(name, event.target.value)} className={inputClass} aria-invalid={!!state.errors?.[name]} aria-describedby={state.errors?.[name] ? `${name}-error` : undefined} />}{fieldError(name)}
      </div>)}
      {!isAppointment ? select("assignedTechnicianId", "Assigned technician", options.technicians, false) : null}
      {select("status", "Status *", statuses.map((status) => ({ id: status, label: statusLabel(status) })), true)}
      {!isAppointment && !editing ? <input type="hidden" name="mileageOut" value="" /> : null}
      {values.status === "cancelled" ? <label className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 sm:col-span-2"><input type="checkbox" name="confirmed" value="yes" required />I confirm cancellation of this {isAppointment ? "appointment" : "work order"}.</label> : null}
    </fieldset>
    <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6"><button disabled={pending} className={`${primaryLink} disabled:opacity-50`}>{pending ? "Saving…" : editing ? "Save Changes" : isAppointment ? "Save Appointment" : "Create Work Order"}</button><Link className={secondaryLink} href={cancelHref}>Cancel</Link></div>
  </form>;
}
