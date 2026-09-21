import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { portalSchema } from "./validation";

// No cookies, staff session, or service-role key. The RPC authorizes only this token.
export function approvalClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Customer approval is temporarily unavailable.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function publicEstimate(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { data, error } = await approvalClient().rpc("read_customer_approval", { p_token: token });
  if (error) throw new Error("Customer approval is temporarily unavailable.");
  const parsed = portalSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
