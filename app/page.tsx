import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";
import { PageHeader } from "@/components/page-header";
import { DashboardSnapshot } from "@/components/jobs/dashboard-snapshot";

const cards = [
  ["Completed Today", "Completed services will be summarized here."],
  ["Upcoming Services", "Future service recommendations will appear here."],
  ["Customer Questions", "New customer concerns will be surfaced here."],
] as const;

const quickActions = [
  ["New Customer", "/customers/new"],
  ["Add Vehicle", "/vehicles/new"],
  ["New Work Order", "/work-orders/new"],
  ["Start Diagnosis", "/diagnosis"],
  ["Schedule Appointment", "/appointments/new"],
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="MekaReports"
        title="Shop Dashboard"
        description="Diagnose. Document. Manage. One workspace for the daily flow of an automotive repair shop."
        action={
          <Link
            href="/diagnosis"
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            Start AI Diagnosis
          </Link>
        }
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Shop Snapshot</h2>
          <span className="text-xs text-slate-400">Appointments and work orders</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardSnapshot />
          {cards.map(([label, detail]) => (
            <DashboardCard key={label} label={label} detail={detail} />
          ))}
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Today&apos;s Shop Activity</h2>
              <p className="mt-1 text-sm text-slate-500">A future timeline of appointments, check-ins, diagnoses, approvals, repairs, and completed jobs.</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="font-semibold text-slate-700">A combined activity timeline is coming later.</p>
            <p className="mt-1 text-sm text-slate-500">View current activity in Appointments and Work Orders.</p>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Quick Actions</h2>
          <div className="mt-5 grid gap-3">
            {quickActions.map(([label, href], index) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  index === 3
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{label}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
