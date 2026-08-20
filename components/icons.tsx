type IconProps = {
  name: string;
  className?: string;
};

const glyphs: Record<string, string> = {
  dashboard: "▦",
  customers: "◎",
  vehicles: "◇",
  appointments: "◷",
  workOrders: "▤",
  diagnosis: "⌁",
  inspections: "✓",
  reports: "▧",
  reminders: "↻",
  questions: "?",
  settings: "⚙",
};

export function AppIcon({ name, className = "" }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-current/15 text-sm font-bold ${className}`}
    >
      {glyphs[name] ?? "•"}
    </span>
  );
}
