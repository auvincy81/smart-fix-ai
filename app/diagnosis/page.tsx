import { notFound } from "next/navigation";
import { requireShopContext } from "@/lib/auth/session";
import { getWorkOrder } from "@/lib/jobs/data";
import { getVehicle } from "@/lib/workshop/data";
import { vehicleTitle } from "@/components/workshop/record-ui";
import DiagnosisWorkspace from "./diagnosis-workspace";

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ workOrderId?: string; vehicleId?: string }> }) {
  const query = await searchParams;
  const context = await requireShopContext();
  if (!query.workOrderId) return <DiagnosisWorkspace />;
  const order = await getWorkOrder(context.shop.id, query.workOrderId);
  if (query.vehicleId && query.vehicleId !== order.vehicleId) notFound();
  const vehicle = await getVehicle(context.shop.id, order.vehicleId);
  return <DiagnosisWorkspace key={order.id} initial={{ vin: vehicle.vin ?? "", vehicle: [vehicleTitle(vehicle), vehicle.engine].filter(Boolean).join(" "), symptoms: order.customerComplaint ?? "", workOrderId: order.id, workOrderNumber: order.workOrderNumber }} />;
}
