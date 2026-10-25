import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./supabase";

/**
 * Returns a Supabase client acting as the signed-in admin (RLS applies), or null if the
 * request's bearer token isn't an owner account.
 */
export async function adminClientFromRequest(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await db.rpc("is_admin");
  return data === true ? db : null;
}
