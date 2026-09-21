"use client";

import { useState, useTransition } from "react";
import { saveDiagnosisNotes } from "@/lib/diagnoses/actions";
import { primaryLink } from "@/components/workshop/record-ui";

export function DiagnosisNotes({ id, initialFindings, initialCause }: { id: string; initialFindings: string | null; initialCause: string | null }) {
  const [findings, setFindings] = useState(initialFindings ?? "");
  const [cause, setCause] = useState(initialCause ?? "");
  const [message, setMessage] = useState("");
  const [pending, transition] = useTransition();
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">Technician Findings</h2><p className="text-sm text-slate-500">Record verified findings separately from the saved AI response.</p><label className="block text-sm font-bold">Findings<textarea value={findings} onChange={(e) => setFindings(e.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><label className="block text-sm font-bold">Confirmed cause<textarea value={cause} onChange={(e) => setCause(e.target.value)} maxLength={5000} rows={2} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label><button disabled={pending} className={`${primaryLink} disabled:opacity-50`} onClick={() => transition(async () => { const result = await saveDiagnosisNotes({ id, findings, confirmedCause: cause }); setMessage(result.message ?? ""); })}>{pending ? "Saving…" : "Save Findings"}</button>{message ? <p role="status">{message}</p> : null}</section>;
}
