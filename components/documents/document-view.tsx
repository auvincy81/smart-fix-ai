import type { CustomerDocument } from "@/lib/documents/validation";
import { PrintDocument } from "./forms";

export function DocumentView({ document: d }: { document: CustomerDocument }) {
  const c = d.context;
  return <article className="customer-document mx-auto max-w-4xl space-y-6 text-slate-900">
    <div className="document-heading border-b-2 border-slate-900 pb-5"><p className="text-sm font-bold uppercase tracking-widest text-red-700">{c.shop}</p><h1 className="mt-3 text-3xl font-extrabold">{d.title}</h1><p className="mt-2 whitespace-pre-wrap text-sm">{c.contact}</p><p className="mt-3 text-lg font-bold">{d.number}</p><p className="mt-2 capitalize">{d.status.replaceAll("_", " ")}</p><p className="mt-2 text-xs text-slate-500">Snapshot as of {new Date(d.as_of).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p></div>
    <div className="no-print"><PrintDocument /></div>
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">{[["Customer",c.customer],["Vehicle",c.vehicle],["VIN",c.vin],["Work order",c.work_order],["Mileage in",c.mileage_in],["Mileage out",c.mileage_out]].filter(([,v]) => v).map(([label,value]) => <div key={label}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>)}</section>
    {d.sections.map((section,index) => <section key={index} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">{section.title}</h2>{section.rows.length ? <dl className="mt-4 divide-y divide-slate-100">{section.rows.map((row,n) => <div key={n} className="document-row space-y-1 py-3"><dt className="break-words font-semibold">{row.label}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-6">{row.value}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">None recorded.</p>}</section>)}
    <p className="text-xs text-slate-500">Prepared through MekaReports. Contact the shop with questions about this document. Monetary amounts are USD, pre-tax unless explicitly stated otherwise.</p>
  </article>;
}
