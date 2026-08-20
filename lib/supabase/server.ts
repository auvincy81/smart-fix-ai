import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";

/**
 * Creates a new cookie-aware server client for the current request. Cookie writes
 * can be rejected in Server Components, so those writes are safely deferred to
 * the Phase 3B session-refresh proxy.
 */
export async function createServerSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate cookies. Phase 3B's proxy will
          // perform refresh writes before protected routes render.
        }
      },
    },
  });
}
