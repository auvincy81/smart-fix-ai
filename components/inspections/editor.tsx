"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tables } from "@/types/database";
import { saveInspection } from "@/lib/inspections/actions";
import { conditions, readinessDisclaimer, type FindingsInput } from "@/lib/inspections/validation";
import { primaryLink, secondaryLink } from "@/components/workshop/record-ui";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm";
const labels = { good: "Good", attention: "Attention", urgent: "Urgent", not_checked: "Not Checked" };
const colors = { good: "has-checked:border-emerald-600 has-checked:bg-emerald-50", attention: "has-checked:border-amber-600 has-checked:bg-amber-50", urgent: "has-checked:border-red-600 has-checked:bg-red-50", not_checked: "has-checked:border-slate-600 has-checked:bg-slate-100" };
export function InspectionEditor({ inspection, items }: { inspection: Tables<"inspections">; items: Tables<"inspection_items">[] }) {
  const router = useRouter();
  const [values, setValues] = useState<FindingsInput["items"]>(() => items.map((i) => ({ id: i.id, condition: i.condition as FindingsInput["items"][number]["condition"], measurement: i.measurement ?? "", technician_note: i.technician_note ?? "", recommendation: i.recommendation ?? "" })));
  const [summary, setSummary] = useState(inspection.summary ?? "");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [pending, startTransition] = useTransition();
  const checked = values.filter((v) => v.condition !== "not_checked").length;
  const missing = values.filter((v) => v.condition === "not_checked" && items.find((i) => i.id === v.id)?.required).length;
  const categories = [...new Set(items.map((i) => i.category))];
  const update = (id: string, changes: Partial<FindingsInput["items"][number]>) => setValues((old) => old.map((i) => i.id === id ? { ...i, ...changes } : i));
  function save(complete: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await saveInspection({ id: inspection.id, updatedAt: inspection.updated_at, items: values, summary, complete, acknowledgeUnchecked: acknowledge });
      if (result.id) { router.push(`/inspections/${result.id}?${complete ? "completed" : "saved"}=1`); router.refresh(); }
      else setMessage(result.message ?? "Unable to save. Your entries remain here.");
    });
  }
  return <div className="space-y-6">
    {inspection.inspection_type === "pre_inspection" ? <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{readinessDisclaimer} Readiness is recalculated on the server when you save.</p> : null}
    <div className="sticky top-16 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm"><p className="font-bold">{checked} of {items.length} items checked</p><progress aria-label="Items checked" max={items.length} value={checked} className="mt-2 w-full accent-red-600" /><p className="text-xs text-slate-500">Unsaved changes stay in this page until you save. Leaving or refreshing discards unsaved entries.</p></div>
    {message ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{message}</p> : null}
    <fieldset disabled={pending} className="space-y-6">
      {categories.map((category) => <section key={category} className="space-y-4"><h2 className="text-xl font-bold">{category}</h2>{items.filter((i) => i.category === category).map((item) => {
        const value = values.find((v) => v.id === item.id)!;
        return <fieldset key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><legend className="max-w-full px-2 font-bold">{item.item_name}</legend><p className="mb-4 text-xs text-slate-500">{item.required ? "Required" : "Optional"}{item.critical ? " · Critical item" : ""}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{conditions.map((condition) => <label key={condition} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm font-bold ${colors[condition]}`}><input type="radio" name={`condition-${item.id}`} aria-label={`${item.item_name}: ${labels[condition]}`} checked={value.condition === condition} onChange={() => update(item.id, { condition })} />{labels[condition]}</label>)}</div>
          <label className="mt-4 block text-sm font-semibold">Measurement<input aria-label={`${item.item_name}: Measurement`} value={value.measurement} maxLength={200} onChange={(e) => update(item.id, { measurement: e.target.value })} placeholder="Observed value and units, when applicable" className={inputClass} /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Technician note<textarea aria-label={`${item.item_name}: Technician note`} rows={2} maxLength={5000} value={value.technician_note} onChange={(e) => update(item.id, { technician_note: e.target.value })} className={inputClass} /></label><label className="block text-sm font-semibold">Recommendation<textarea aria-label={`${item.item_name}: Recommendation`} rows={2} maxLength={5000} value={value.recommendation} onChange={(e) => update(item.id, { recommendation: e.target.value })} className={inputClass} /></label></div>
        </fieldset>;
      })}</section>)}
      <label className="block text-sm font-bold">Inspection summary<textarea rows={3} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputClass} /></label>
      {confirming ? <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-5"><p className="font-bold">Complete this inspection?</p><p className="text-sm">Completion preserves these findings as a read-only snapshot. It does not complete the work order.</p>{missing ? <label className="flex min-h-12 items-start gap-3 text-sm"><input type="checkbox" checked={acknowledge} onChange={(e) => setAcknowledge(e.target.checked)} className="mt-1" />I acknowledge that {missing} required items remain Not Checked. They will remain unchecked{inspection.inspection_type === "pre_inspection" ? " and readiness will remain Incomplete" : ""}.</label> : null}<button type="button" onClick={() => save(true)} disabled={pending || (!!missing && !acknowledge)} className={`${primaryLink} disabled:opacity-50`}>Confirm Completion</button><button type="button" onClick={() => setConfirming(false)} className="ml-4 text-sm font-bold">Keep Editing</button></div> : null}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => save(false)} className={`${primaryLink} disabled:opacity-50`}>{pending ? "Saving…" : "Save Progress"}</button><button type="button" disabled={pending} onClick={() => setConfirming(true)} className={secondaryLink}>Complete Inspection</button><Link href={`/inspections/${inspection.id}`} className={secondaryLink}>View Saved Findings</Link></div>
    </fieldset>
  </div>;
}
