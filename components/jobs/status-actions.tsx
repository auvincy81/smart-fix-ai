"use client";
import { useActionState, useState } from "react";
import { changeJobStatus } from "@/lib/jobs/actions";
import { statusLabel } from "@/lib/jobs/status";
import { secondaryLink } from "@/components/workshop/record-ui";

const labels: Record<string, string> = { checked_in: "Check In", no_show: "Mark No Show", cancelled: "Cancel", diagnosing: "Begin Diagnosing", waiting_approval: "Request Approval", approved: "Mark Approved", in_progress: "Start Work", completed: "Mark Completed", in_service: "Start Service", confirmed: "Confirm Appointment", open: "Open Work Order" };
export function StatusAction({ kind, id, status }: { kind: "appointment" | "work-order"; id: string; status: string }) {
  const [state, action, pending] = useActionState(changeJobStatus.bind(null, kind, id), {});
  const [confirming, setConfirming] = useState(false);
  const cancel = status === "cancelled";
  return <form action={action} className="space-y-2"><input type="hidden" name="status" value={status} />
    {cancel && !confirming ? <button type="button" className={secondaryLink} onClick={() => setConfirming(true)}>Cancel {kind === "appointment" ? "Appointment" : "Work Order"}</button>
      : <>{cancel ? <><p className="text-sm text-red-700">Cancel this {kind === "appointment" ? "appointment" : "work order"}? The record will be retained.</p><input type="hidden" name="confirmed" value="yes" /></> : null}<button disabled={pending} className={`${secondaryLink} disabled:opacity-50`}>{pending ? "Updating…" : cancel ? "Confirm cancellation" : labels[status] ?? statusLabel(status)}</button>{cancel ? <button type="button" className="ml-3 text-sm" onClick={() => setConfirming(false)}>Keep record</button> : null}</>}
    {state.message ? <p role="status" className="text-sm text-slate-600">{state.message}</p> : null}
  </form>;
}
