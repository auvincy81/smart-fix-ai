import { DashboardCard } from "@/components/dashboard-card";
import { getCurrentShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { todayBounds } from "@/lib/jobs/time";

export async function DashboardSnapshot() {
  const context = await getCurrentShopContext();
  const labels = ["Today's Appointments", "Vehicles In Service", "Open Work Orders", "Waiting for Customer Approval", "Completed Today", "Upcoming Services"];
  if (!context.ok) return <>{labels.map((label) => <DashboardCard key={label} label={label} detail={context.code === "SHOP_CONTEXT_UNAVAILABLE" ? "Shop totals temporarily unavailable. Please try again." : "Sign in and select your shop workspace to view real totals."} />)}</>;
  const db = await workshopDb();
  const shopId = context.data.shop.id;
  const active = ["open", "diagnosing", "waiting_approval", "approved", "in_progress"];
  const bounds = todayBounds();
  const [appointments, orders, approvals, completed, recommendations] = await Promise.all([
    db.from("appointments").select("id", { count: "exact", head: true }).eq("shop_id", shopId).gte("scheduled_start", bounds.start).lt("scheduled_start", bounds.end).not("status", "in", "(cancelled,no_show)"),
    db.from("work_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).in("status", active),
    db.from("work_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "waiting_approval"),
    db.from("work_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "completed").gte("completed_at", bounds.start).lt("completed_at", bounds.end),
    db.from("service_reminder_readiness").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "recommended").eq("due_state", "upcoming"),
  ]);
  const vehicleIds = new Set<string>();
  let vehiclesFailed = false;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("work_orders").select("id, vehicle_id").eq("shop_id", shopId).in("status", active).order("id").range(offset, offset + 499);
    if (error) { vehiclesFailed = true; break; }
    data.forEach((r) => vehicleIds.add(r.vehicle_id));
    if (data.length < 500) break;
  }
  const values = [appointments.error ? undefined : String(appointments.count ?? 0), vehiclesFailed ? undefined : String(vehicleIds.size), orders.error ? undefined : String(orders.count ?? 0), approvals.error ? undefined : String(approvals.count ?? 0), completed.error ? undefined : String(completed.count ?? 0), recommendations.error ? undefined : String(recommendations.count ?? 0)];
  const details = ["Today's visits in New York time, excluding cancelled and no-show.", "Distinct vehicles on active work orders.", "Active jobs, excluding drafts, completed and cancelled.", "Jobs with status Waiting Approval.", "Work orders completed today in New York time.", "Recommendations not yet due by date or known mileage."];
  return <>{labels.map((label, i) => <DashboardCard key={label} label={label} value={values[i]} detail={values[i] === undefined ? "Shop totals temporarily unavailable." : details[i]} />)}</>;
}
