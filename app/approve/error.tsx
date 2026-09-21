"use client";
export default function ApprovalError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-5 py-20"><h1 className="text-2xl font-bold">Estimate temporarily unavailable</h1><p className="my-4">Try again or contact the shop.</p><button onClick={reset} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Try Again</button></main>;
}
