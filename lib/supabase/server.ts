import "server-only";
import { getSupabasePublicConfig } from "./config";

/**
 * Returns public server-side connection settings, or null while MekaReports is local-only.
 * A cookie-aware Supabase server client will be activated with authentication in Phase 3.
 */
export function getSupabaseServerConfig() {
  return getSupabasePublicConfig();
}
