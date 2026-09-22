import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./config";
import { boundedSupabaseFetch } from "./fetch";

/**
 * Creates a new cookie-aware server client for the current request. Cookie writes
 * can be rejected in Server Components, so those writes are safely deferred to
 * the session-refresh proxy on account and real-data routes.
 */
export async function createServerSupabaseClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    global: { fetch: boundedSupabaseFetch },
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
          // Server Components cannot mutate cookies. The scoped proxy performs
          // refresh writes before account and real-data routes render.
        }
      },
    },
  });
}
