import type { ShopMemberRole } from "@/types/mekareports";

export function canManageRecords(role: ShopMemberRole) {
  return role === "owner" || role === "manager" || role === "service_advisor";
}
