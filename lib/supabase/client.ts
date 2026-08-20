import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig, isSupabaseConfigured } from "./config";

/**
 * Creates the cookie-aware browser client when MekaReports has public Supabase
 * configuration. Local development remains usable when it does not.
 */
export function createBrowserSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}

export const isSupabaseClientConfigured = isSupabaseConfigured;
