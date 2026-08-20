export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

/** Returns null until this repository is connected to its dedicated Supabase project. */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}
