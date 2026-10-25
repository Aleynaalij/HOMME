import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public values (safe to ship to the browser). Valid env vars override them; the fallbacks keep the
// site working if the Vercel env vars are missing or mistyped.
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const supabaseUrl = envUrl && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(envUrl) ? envUrl : "https://gkhdmpbimtxdijmtucsf.supabase.co";
export const supabaseAnonKey = envKey && /^(sb_publishable_|eyJ)/.test(envKey) ? envKey : "sb_publishable_oIwrNexTJ0-QkqeK6Bk84w_JsxaOoVS";

let browserClient: SupabaseClient | null = null;

/** Browser client — keeps the admin's auth session in localStorage. */
export function getBrowserClient() {
  if (!browserClient) browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

/** Stateless server client using the public key; RLS applies. */
export function getServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

/** Privileged server client (Stripe webhook only). Requires SUPABASE_SERVICE_ROLE_KEY. */
export function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}
