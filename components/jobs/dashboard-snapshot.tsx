import { DashboardCard } from "@/components/dashboard-card";
import { getCurrentShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { todayBounds } from "@/lib/jobs/time";

export async function DashboardSnapshot() {
  const context = await getCurrentShopContext();
  const labels = ["Today's Appointments", "Vehicles In Service", "Open Work Orders", "Waiting for Customer Approval"];
  if (!context.ok) return <>{labels.map((label) => <DashboardCard key={label} label={label} detail="Sign in and select your shop workspace to view real totals." />)}</>;
  const db = await workshopDb();
  const shopId = context.data.shop.id;
  const active = ["open", "diagnosing", "waiting_approval", "approved", "in_progress"];
  const bounds = todayBounds();
  const [appointments, orders, approvals] = await Promise.all([
    db.from("appointments").select("id", { count: "exact", head: true }).eq("shop_id", shopId).gte("scheduled_start", bounds.start).lt("scheduled_start", bounds.end).not("status", "in", "(cancelled,no_show)"),
    db.from("work_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).in("status", active),
    db.from("work_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "waiting_approval"),
  ]);
  const vehicleIds = new Set<string>();
  let vehiclesFailed = false;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("work_orders").select("id, vehicle_id").eq("shop_id", shopId).in("status", active).order("id").range(offset, offset + 499);
    if (error) { vehiclesFailed = true; break; }
    data.forEach((r) => vehicleIds.add(r.vehicle_id));
    if (data.length < 500) break;
  }
  const values = [appointments.error ? undefined : String(appointments.count ?? 0), vehiclesFailed ? undefined : String(vehicleIds.size), orders.error ? undefined : String(orders.count ?? 0), approvals.error ? undefined : String(approvals.count ?? 0)];
  const details = ["Today's visits in New York time, excluding cancelled and no-show.", "Distinct vehicles on active work orders.", "Active jobs, excluding drafts, completed and cancelled.", "Jobs with status Waiting Approval."];
  return <>{labels.map((label, i) => <DashboardCard key={label} label={label} value={values[i]} detail={values[i] === undefined ? "Shop totals temporarily unavailable." : details[i]} />)}</>;
}
