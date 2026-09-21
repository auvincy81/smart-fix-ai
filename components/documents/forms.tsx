"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { documentAction, revokeLink, shareDocument } from "@/lib/documents/actions";
import type { DocumentState } from "@/lib/documents/validation";
import { primaryLink, secondaryLink } from "@/components/workshop/record-ui";

export function PrintDocument() { return <button className={`${secondaryLink} min-h-12`} onClick={() => window.print()}>Print / Save as PDF</button>; }
export function DocumentAction({ kind, id, action, label, confirmation, payment = false, requestKey }: { kind: string; id: string; action: string; label: string; confirmation?: string; payment?: boolean; requestKey?: string }) {
  const [state, submit, pending] = useActionState<DocumentState, FormData>(documentAction.bind(null, kind, id, action), {});
  const [, transition] = useTransition(); const [request] = useState(requestKey);
  return <form aria-label={label} className="no-print space-y-4" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); transition(() => submit(form)); }}>
    {!(state.success && payment) ? <fieldset disabled={pending} className="space-y-4">
      {payment ? <><p className="text-sm">Record money already received by the shop. Do not enter full card numbers, CVV, or banking credentials.</p><input type="hidden" name="request_key" value={request} /><label className="block font-semibold">Amount received (USD)<input className="mt-2 min-h-12 w-full rounded-xl border p-3" type="number" min="0.01" step="0.01" name="amount" required /></label><label className="block font-semibold">Payment method<select name="method" className="mt-2 min-h-12 w-full rounded-xl border p-3">{["cash", "card", "check", "bank_transfer", "other"].map((m) => <option key={m} value={m}>{m.replaceAll("_", " ")}</option>)}</select></label><label className="block font-semibold">Reference (optional; transaction ID only)<input name="payment_reference" maxLength={80} className="mt-2 min-h-12 w-full rounded-xl border p-3" /></label><label className="block font-semibold">Internal payment note (optional)<input name="note" maxLength={500} className="mt-2 min-h-12 w-full rounded-xl border p-3" /></label></> : null}
      {confirmation ? <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm"><input type="checkbox" required className="mt-1" />{confirmation}</label> : null}
      <button className={`${primaryLink} min-h-12 disabled:opacity-50`} disabled={pending}>{pending ? "Saving…" : label}</button>
    </fieldset> : <p className="font-semibold text-emerald-800">Payment recorded. Reload this page to record another payment.</p>}
    {state.message ? <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm">{state.message}</p> : null}
    {state.receiptId ? <Link className={secondaryLink} href={`/receipts/${state.receiptId}`}>View Receipt</Link> : state.id && action === "create" ? <Link className={secondaryLink} href={`/${kind === "invoice" ? "invoices" : "reports"}/${state.id}`}>Review Document</Link> : null}
  </form>;
}
export function ShareDocument({ kind, id }: { kind: string; id: string }) {
  const [state, setState] = useState<DocumentState>({}); const [pending, transition] = useTransition(); const [copied,setCopied] = useState(false);
  return <div className="no-print space-y-3"><div className="flex flex-wrap gap-3"><button className={`${secondaryLink} min-h-12`} disabled={pending} onClick={() => transition(async () => setState(await shareDocument(kind,id)))}>Create Private Document Link</button><Link className={`${primaryLink} min-h-12`} href={`/communications/new?kind=${kind}&id=${id}`}>Send by Email / Text</Link></div>
    {state.path ? <div className="space-y-3 rounded-xl border p-4"><p className="text-sm">Anyone with this private link can read this snapshot. Copy it now; it is not stored in plain text.</p><a className="block font-bold text-red-700" href={state.path} target="_blank" rel="noreferrer">Open Customer Document</a><button className={secondaryLink} onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin+state.path); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Link Copied" : "Copy Private Link"}</button></div> : null}{state.message ? <p role="status" className="text-sm">{state.message}</p> : null}
  </div>;
}
export function RevokeLink({ id }: { id: string }) { const [state,setState]=useState<DocumentState>({}); const [pending,transition]=useTransition(); return <div><button className={secondaryLink} disabled={pending || state.success} onClick={() => transition(async () => setState(await revokeLink(id)))}>Revoke Link</button>{state.message ? <p role="status" className="mt-2 text-sm">{state.message}</p> : null}</div>; }
