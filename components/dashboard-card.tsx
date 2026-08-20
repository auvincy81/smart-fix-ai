type DashboardCardProps = {
  label: string;
  value?: string;
  detail: string;
};

export function DashboardCard({ label, value = "—", detail }: DashboardCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}
