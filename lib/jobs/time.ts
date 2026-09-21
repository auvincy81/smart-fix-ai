// Local shop time is explicit and independent of the server/browser host zone.
// A configurable timezone per shop can replace this default in a later phase.
export const shopTimeZone = "America/New_York";
export function localDateTime(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: shopTimeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
export function toInstant(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const desired = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(desired)) return null;
  let candidate = desired;
  for (let i = 0; i < 3; i++) {
    const observed = Date.parse(`${localDateTime(new Date(candidate).toISOString())}:00Z`);
    candidate += desired - observed;
  }
  const result = new Date(candidate).toISOString();
  // Reject impossible dates and spring-forward times instead of silently shifting.
  return localDateTime(result) === local ? result : null;
}
export function todayBounds(now = new Date()) {
  const date = localDateTime(now.toISOString()).slice(0, 10);
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return { start: toInstant(`${date}T00:00`)!, end: toInstant(`${next}T00:00`)! };
}
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: shopTimeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
