import { PageHeader } from "./page-header";

type PlaceholderPageProps = {
  title: string;
  description: string;
  planned: string[];
};

export function PlaceholderPage({ title, description, planned }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader eyebrow="MekaReports" title={title} description={description} />
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">No records yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This module is part of the MekaReports application foundation. It is intentionally not connected to a database yet, and no sample customer or shop records have been inserted.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">Persistent shop data will be added in a later phase.</p>
            <p className="mt-1 text-sm text-slate-500">The interface is ready for the real workflow—without fake production data.</p>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Planned capabilities</h2>
          <ul className="mt-4 space-y-3">
            {planned.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
