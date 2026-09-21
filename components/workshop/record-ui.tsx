import Link from "next/link";

export const primaryLink = "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700";
export const secondaryLink = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50";
export const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
export function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)); }
export function vehicleTitle(vehicle: { year: number | null; make: string | null; model: string | null }) { return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle details pending"; }
export function Details({ entries }: { entries: [string, string | number | null][] }) {
  return <dl className="grid gap-5 sm:grid-cols-2">{entries.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{value ?? "Not provided"}</dd></div>)}</dl>;
}
export function ServiceHistory() { return <section className={panel}><h2 className="text-lg font-bold">Service History</h2><p className="mt-3 text-sm text-slate-500">No service history is available. Completed work orders will appear here when service tracking is connected.</p></section>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><h2 className="font-bold text-slate-800">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></div>; }
export function Search({ q, label }: { q: string; label: string }) { return <form className="mb-5 flex flex-col gap-2 sm:flex-row"><label htmlFor="search" className="sr-only">{label}</label><input id="search" name="q" defaultValue={q} placeholder={label} maxLength={100} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm sm:max-w-lg" /><button className={secondaryLink}>Search</button></form>; }
export function Pagination({ base, q, page, count }: { base: string; q: string; page: number; count: number }) {
  const href = (n: number) => `${base}?${new URLSearchParams({ q, page: String(n) })}`;
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-600"><span>{count} record{count === 1 ? "" : "s"} · Page {page}</span><div className="flex gap-3">{page > 1 ? <Link className={secondaryLink} href={href(page - 1)}>Previous</Link> : null}{page * 25 < count ? <Link className={secondaryLink} href={href(page + 1)}>Next</Link> : null}</div></div>;
}
