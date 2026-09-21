"use client";
export default function DocumentError({reset}:{reset:()=>void}){return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-bold">Document Temporarily Unavailable</h1><p>Please try again or contact the shop.</p><button onClick={reset} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Try Again</button></main>;}
