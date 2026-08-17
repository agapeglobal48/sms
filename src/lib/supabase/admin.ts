import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * SERVER-ONLY. Never import this into a Client Component or expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser — it bypasses Row Level Security.
 *
 * Used for privileged actions only Superadmin should trigger, e.g.
 * creating a School Admin's login when a new school is created.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
