import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serviceFetch } from "./request.ts";

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Account access is not configured. Please contact the site owner.");
  client = createClient(url, key, {
    global: {
      fetch: (input, init) => serviceFetch(input, init, "The account service", 15000),
    },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
