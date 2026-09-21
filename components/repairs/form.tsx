"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { repairAction } from "@/lib/repairs/actions";
import type { RepairAction, RepairState } from "@/lib/repairs/validation";
import { primaryLink } from "@/components/workshop/record-ui";

export type RepairField = { name: string; label: string; type?: "text" | "textarea" | "number" | "date" | "select"; required?: boolean; value?: string | number | null; step?: string; options?: { value: string; label: string }[] };
type Props = { jobId: string; action: RepairAction; label: string; fields?: RepairField[]; hidden?: Record<string, string>; confirmation?: string; repeat?: boolean };
export function RepairForm(props: Props) {
  const [entry, setEntry] = useState({ key: 0, requestKey: props.hidden?.request_key });
  return <FormBody key={entry.key} {...props} hidden={{ ...props.hidden, ...(entry.requestKey ? { request_key: entry.requestKey } : {}) }} another={() => setEntry((old) => ({ key: old.key + 1, requestKey: crypto.randomUUID() }))} />;
}
function FormBody({ jobId, action, label, fields = [], hidden = {}, confirmation, repeat, another }: Props & { another: () => void }) {
  const [state, submit, pending] = useActionState<RepairState, FormData>(repairAction.bind(null, jobId, action), {});
  const [, transition] = useTransition();
  const [requestKey] = useState(hidden.request_key);
  const [copied, setCopied] = useState(false);
  const prefix = useId();
  return <form aria-label={label} className="space-y-4" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); transition(() => submit(data)); }}>
    {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={name === "request_key" ? requestKey : value} />)}
    {!(repeat && state.success) ? <fieldset disabled={pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{fields.map((f) => <label key={f.name} htmlFor={`${prefix}-${f.name}`} className={`block text-sm font-semibold ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
        {f.label}{f.required ? " *" : ""}
        {f.type === "textarea" ? <textarea id={`${prefix}-${f.name}`} name={f.name} defaultValue={f.value ?? ""} required={f.required} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3" />
          : f.type === "select" ? <select id={`${prefix}-${f.name}`} name={f.name} defaultValue={f.value ?? ""} required={f.required} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3">{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            : <input id={`${prefix}-${f.name}`} name={f.name} type={f.type ?? "text"} defaultValue={f.value ?? ""} required={f.required} min={f.type === "number" ? 0 : undefined} step={f.step ?? (f.type === "number" ? "0.01" : undefined)} maxLength={500} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3" />}
      </label>)}</div>
      {confirmation ? <label className="flex min-h-12 items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" required className="mt-1" />{confirmation}</label> : null}
      <button disabled={pending} className={`${primaryLink} min-h-12 disabled:opacity-50`}>{pending ? "Saving…" : label}</button>
    </fieldset> : <button type="button" className={primaryLink} onClick={another}>Add Another</button>}
    {state.message ? <p role="status" className={`rounded-xl p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    {state.token ? <div className="space-y-3 rounded-xl border border-red-200 p-4"><p className="text-sm">Anyone with this private link can review and authorize this estimate. It expires in seven days.</p><a href={`/approve/${state.token}`} target="_blank" rel="noreferrer" className="block font-bold text-red-700">Open Customer Approval</a><button type="button" className={primaryLink} onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/approve/${state.token}`); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Link Copied" : "Copy Customer Approval Link"}</button></div> : null}
  </form>;
}
