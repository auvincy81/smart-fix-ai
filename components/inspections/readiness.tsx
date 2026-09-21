import type { Tables } from "@/types/database";
import { readinessDisclaimer, resultLabel } from "@/lib/inspections/validation";

export function ReadinessSummary({ inspection, items }: { inspection: Tables<"inspections">; items: Tables<"inspection_items">[] }) {
  const counts = { good: 0, attention: 0, urgent: 0, not_checked: 0 };
  for (const item of items) if (item.condition in counts) counts[item.condition as keyof typeof counts]++;
  const blockers = Array.isArray(inspection.readiness_blockers) ? inspection.readiness_blockers.filter((b): b is { item: string; reason: string } => !!b && typeof b === "object" && !Array.isArray(b) && typeof b.item === "string" && typeof b.reason === "string") : [];
  const incomplete = items.filter((i) => i.required && i.condition === "not_checked").length;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 className="text-xl font-bold">{inspection.inspection_type === "pre_inspection" ? "Generic Readiness" : "Inspection Progress"}</h2>
    {inspection.inspection_type === "pre_inspection" ? <><p className="mt-4 text-3xl font-extrabold">Readiness Score: {inspection.readiness_score ?? "—"}{inspection.readiness_score !== null ? "%" : ""}</p><p className={`mt-3 inline-block rounded-full px-4 py-2 font-bold ${inspection.readiness_result === "likely_ready" ? "bg-emerald-50 text-emerald-800" : inspection.readiness_result === "high_risk" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{resultLabel(inspection.readiness_result)}</p><p className="mt-3 text-sm text-slate-500">Jurisdiction: {inspection.jurisdiction_state || "Not specified"} · Generic criteria {inspection.criteria_version || "Legacy / unspecified"}</p><p className="mt-4 text-sm leading-6">{readinessDisclaimer}</p></> : null}
    <p className="mt-5 font-bold">{items.length - counts.not_checked} of {items.length} items checked</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><span>Good: {counts.good}</span><span>Attention: {counts.attention}</span><span>Urgent: {counts.urgent}</span><span>Not Checked: {counts.not_checked}</span></div>
    {incomplete ? <p className="mt-4 font-semibold text-amber-800">{incomplete} required items not checked.</p> : null}
    {blockers.length ? <div className="mt-5"><h3 className="font-bold">Readiness Blockers</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{blockers.map((b, index) => <li key={index}>{b.item}: {b.reason}</li>)}</ul></div> : null}
  </section>;
}
