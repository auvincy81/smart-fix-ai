import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicEstimate } from "@/lib/repairs/public";
import { ApprovalForm } from "@/components/repairs/approval";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review Your Repair Estimate | MekaReports", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function CustomerApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await publicEstimate(token);
  if (!estimate) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"><div className="mx-auto max-w-3xl space-y-6">
    <header className="space-y-3"><p className="text-sm font-bold uppercase tracking-widest text-red-700">{estimate.shop_name}</p><h1 className="text-3xl font-extrabold">Review Your Repair Estimate</h1><p>{[estimate.shop_phone, estimate.shop_email].filter(Boolean).join(" · ")}</p></header>
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5"><p className="font-bold">{estimate.customer_name} · {estimate.vehicle}</p><p className="break-all text-sm">VIN: {estimate.vin || "Not recorded"}</p><p className="text-sm">Mileage in: {estimate.mileage?.toLocaleString() ?? "Not recorded"}</p><p>{estimate.work_order} · {estimate.estimate_number} · Version {estimate.version}</p><p className="font-bold">{estimate.status.replaceAll("_", " ")}</p>{estimate.customer_note ? <p className="whitespace-pre-wrap">{estimate.customer_note}</p> : null}</section>
    <ApprovalForm estimate={estimate} token={token} />
    <footer className="text-center text-xs text-slate-500">Customer authorization recorded through MekaReports. This is not a legally certified electronic signature service.</footer>
  </div></main>;
}
