import { getSupabasePublicConfig } from "./config";

/**
 * Reports whether browser Supabase configuration is available.
 * Client creation remains deferred until MekaReports has its own cloud project and Phase 3 auth policies.
 */
export function isSupabaseClientConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}
