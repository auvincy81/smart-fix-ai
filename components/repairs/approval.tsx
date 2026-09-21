"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordStaffApproval } from "@/lib/repairs/actions";
import { moneyText, sumMoney, type PortalEstimate } from "@/lib/repairs/validation";
import { primaryLink } from "@/components/workshop/record-ui";

export function ApprovalForm({ estimate, token, staffEstimateId }: { estimate: PortalEstimate; token?: string; staffEstimateId?: string }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<number, "approved" | "declined">>({});
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, transition] = useTransition();
  const resolved = saved || estimate.status !== "presented" || estimate.request_status === "responded";
  const decisionFor = (item: PortalEstimate["items"][number]) => saved && item.decision === "pending" ? decisions[item.line] : item.decision;
  const approved = sumMoney(estimate.items.filter((i) => (resolved ? decisionFor(i) : decisions[i.line]) === "approved").map((i) => i.total_amount));
  return <form aria-label="Customer authorization" className="space-y-6" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { decisions: estimate.items.map((i) => ({ line: i.line, decision: decisions[i.line] })), name: String(form.get("name") ?? ""), note: String(form.get("note") ?? ""), acknowledge: form.get("acknowledge") === "yes", method: form.get("method") };
    setMessage("");
    transition(async () => {
      try {
        if (staffEstimateId) {
          const result = await recordStaffApproval(staffEstimateId, input);
          setMessage(result.message ?? "");
          if (result.success) { setSaved(true); router.refresh(); }
        } else {
          const response = await fetch(`/api/approvals/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Authorization could not be recorded.");
          setSaved(true); setMessage("Customer authorization recorded."); router.refresh();
        }
      } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record authorization. Try again."); }
    });
  }}>
    {estimate.items.map((item) => <fieldset key={item.line} disabled={pending || resolved} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <legend className="px-2 text-lg font-bold">Repair {item.line}: {item.description}</legend>
      <div className="grid grid-cols-2 gap-3 text-sm"><span>Labor ({item.labor_hours} hours × {moneyText(item.labor_rate)})</span><strong className="text-right">{moneyText(item.labor_amount)}</strong><span>Parts</span><strong className="text-right">{moneyText(item.parts_amount)}</strong><span>Fees</span><strong className="text-right">{moneyText(item.fees_amount)}</strong><span className="font-bold">Repair total · pre-tax</span><strong className="text-right text-lg">{moneyText(item.total_amount)}</strong></div>
      {item.parts.length ? <ul className="space-y-2 text-sm text-slate-600">{item.parts.map((p, index) => <li key={index}>{p.name}{p.number ? ` (${p.number})` : ""} · {p.quantity} × {moneyText(p.unit_price)} = {moneyText(p.amount)}</li>)}</ul> : null}
      {resolved ? <p className="rounded-xl bg-slate-100 p-3 font-bold">Decision: {decisionFor(item)?.replaceAll("_", " ")}</p> : <div className="grid grid-cols-2 gap-3">{(["approved", "declined"] as const).map((decision) => <label key={decision} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 font-bold ${decisions[item.line] === decision ? decision === "approved" ? "border-emerald-600 bg-emerald-50" : "border-red-600 bg-red-50" : "border-slate-200"}`}><input type="radio" name={`decision-${item.line}`} required checked={decisions[item.line] === decision} onChange={() => setDecisions((old) => ({ ...old, [item.line]: decision }))} aria-label={`Repair ${item.line}: ${decision === "approved" ? "Approve" : "Decline"}`} />{decision === "approved" ? "Approve" : "Decline"}</label>)}</div>}
    </fieldset>)}
    <section className="space-y-3 rounded-2xl bg-slate-950 p-5 text-white"><p>Full estimate · pre-tax <strong className="float-right">{moneyText(estimate.grand_total)}</strong></p><p className="text-xl font-bold">Selected repairs <span className="float-right">{moneyText(approved)}</span></p><p className="clear-both pt-2 text-sm text-slate-300">Prices exclude tax. No tax rules or tax amount have been applied. Discuss applicable taxes with the shop before work begins.</p></section>
    {!resolved ? <fieldset disabled={pending} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {staffEstimateId ? <label className="block font-semibold">Response method<select name="method" required className="mt-2 w-full rounded-xl border border-slate-300 p-3"><option value="phone">Phone</option><option value="in_person">In person</option></select></label> : null}
      <label className="block font-semibold">Customer name<input name="name" required maxLength={200} autoComplete="name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="block font-semibold">Customer note (optional)<textarea name="note" maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm"><input type="checkbox" required name="acknowledge" value="yes" className="mt-1" />{staffEstimateId ? "I confirm the named customer authorized the selected repairs by the recorded method at these pre-tax prices." : "I authorize only the repairs I approved at the displayed pre-tax prices. I understand declined repairs will not be performed."}</label>
      <p className="text-sm text-slate-500">Choose every repair before submitting. Your choices will be recorded and cannot be changed through this link. Contact the shop for a revised estimate.</p>
      <button disabled={pending} className={`${primaryLink} min-h-14 w-full disabled:opacity-50`}>{pending ? "Recording…" : "Record Customer Authorization"}</button>
    </fieldset> : <p className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-900">Customer authorization recorded. Contact the shop if you need to discuss a change.</p>}
    {message ? <p role="status" className="rounded-xl bg-slate-100 p-4">{message}</p> : null}
  </form>;
}
