import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

/** Browser client — keeps the admin's auth session in localStorage. */
export function getBrowserClient() {
  if (!browserClient) browserClient = createClient(url, anonKey);
  return browserClient;
}

/** Stateless server client using the public key; RLS applies. */
export function getServerClient() {
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/** Privileged server client (Stripe webhook only). Requires SUPABASE_SERVICE_ROLE_KEY. */
export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
