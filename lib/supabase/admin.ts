// ============================================================
// Admin Supabase client — bypasses RLS using service role key
// Used for dev seeding and background jobs only
// ============================================================

import { createClient } from '@supabase/supabase-js';

export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
