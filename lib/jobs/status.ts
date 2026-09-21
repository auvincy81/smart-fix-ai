import type { AppointmentStatus, WorkOrderStatus } from "@/types/mekareports";

export const appointmentStatuses = ["requested", "confirmed", "checked_in", "in_service", "completed", "cancelled", "no_show"] as const;
export const workOrderStatuses = ["draft", "open", "diagnosing", "waiting_approval", "approved", "in_progress", "completed", "cancelled"] as const;
export const appointmentTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ["confirmed", "checked_in", "no_show", "cancelled"], confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["in_service", "cancelled"], in_service: ["completed", "cancelled"], completed: [], cancelled: [], no_show: [],
};
export const workOrderTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["open", "cancelled"], open: ["diagnosing", "cancelled"], diagnosing: ["waiting_approval", "cancelled"],
  waiting_approval: ["approved", "cancelled"], approved: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"], completed: [], cancelled: [],
};
export function statusLabel(value: string) {
  return value.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}
