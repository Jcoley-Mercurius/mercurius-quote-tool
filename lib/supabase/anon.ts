import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let anonServerClient: SupabaseClient | null = null;

/** Server-side anon client for public RPCs (share tokens, invite previews). */
export function createAnonSupabaseClient(): SupabaseClient {
  if (anonServerClient) return anonServerClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  anonServerClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return anonServerClient;
}