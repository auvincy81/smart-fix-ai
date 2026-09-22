import Link from "next/link";
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
      <Link href="/" className="mb-4 inline-block rounded-lg p-3 font-bold text-red-700">Back to Dashboard</Link>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Unavailable during this beta</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Customer Questions remains deferred. Use the customer record and appointment concern to document a conversation during this beta.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">A customer messaging inbox is planned for a later release.</p>
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
