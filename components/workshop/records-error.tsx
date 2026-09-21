"use client";

export function RecordsError({ reset }: { reset: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8"><h2 className="text-xl font-bold">We couldn&apos;t load your shop records</h2><p className="mt-3 text-slate-600">Please try again. Your saved records have not been changed.</p><button onClick={reset} className="mt-5 rounded-xl bg-red-600 px-4 py-3 font-bold text-white">Try again</button></div>;
}
