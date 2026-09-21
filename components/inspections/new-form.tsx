"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { createInspection } from "@/lib/inspections/actions";
import { readinessDisclaimer, states } from "@/lib/inspections/validation";
import { primaryLink, secondaryLink } from "@/components/workshop/record-ui";

const input = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm";
export function NewInspectionForm({ orders, technicians, initialOrder, initialType, initialTechnician, requestKey }: {
  orders: { id: string; label: string; technicianId: string | null }[]; technicians: { id: string; label: string }[];
  initialOrder: string; initialType: string; initialTechnician: string; requestKey: string;
}) {
  const [state, action, pending] = useActionState(createInspection, {});
  const [order, setOrder] = useState(initialOrder);
  const [type, setType] = useState(initialType);
  const [technician, setTechnician] = useState(initialTechnician);
  return <form method="post" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data)); }} className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
    {state.message ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{state.message}</p> : null}
    {!orders.length ? <p>Create a work order before starting an inspection. <Link href="/work-orders/new" className="font-bold text-red-700">New Work Order</Link></p> : null}
    <input type="hidden" name="requestKey" value={requestKey} />
    <fieldset disabled={pending} className="space-y-5">
      <label className="block text-sm font-bold">Work order *<select required name="workOrderId" value={order} onChange={(e) => { setOrder(e.target.value); setTechnician(orders.find((o) => o.id === e.target.value)?.technicianId || initialTechnician); }} className={input}><option value="">Choose a work order</option>{orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="block text-sm font-bold">Inspection type *<select name="type" value={type} onChange={(e) => setType(e.target.value)} className={input}><option value="multipoint">Multi-Point Inspection</option><option value="pre_inspection">Pre-Inspection Readiness</option></select></label>
      <label className="block text-sm font-bold">Performing technician *<select required name="technicianId" value={technician} onChange={(e) => setTechnician(e.target.value)} className={input}>{technicians.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      {type === "pre_inspection" ? <><label className="block text-sm font-bold">Jurisdiction / state<select name="jurisdictionState" className={input} defaultValue=""><option value="">Not specified</option>{states.map((state) => <option key={state}>{state}</option>)}</select></label><div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><p className="font-bold">Generic Readiness · Version 1.0</p><p>{readinessDisclaimer}</p><p>No verified state-specific checklist pack is available yet. Selecting a state records context and does not change the generic criteria.</p></div></> : <input name="jurisdictionState" type="hidden" value="" />}
      <p className="text-sm text-slate-500">A new checklist starts with every item Not Checked. Save actual observations as you perform the inspection.</p>
      <div className="flex flex-wrap gap-3"><button disabled={pending || !orders.length} className={`${primaryLink} disabled:opacity-50`}>{pending ? "Creating…" : "Create Inspection"}</button><Link className={secondaryLink} href={initialOrder ? `/work-orders/${initialOrder}` : "/inspections"}>Cancel</Link></div>
    </fieldset>
  </form>;
}
