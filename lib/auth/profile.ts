import type { User } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';

type EnsureProfileInput = {
  user: User;
  fullNameOverride?: string | null;
};

function deriveName(user: User, fullNameOverride?: string | null) {
  return fullNameOverride
    || (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null)
    || (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null)
    || user.email?.split('@')[0]
    || 'User';
}

export async function ensureUserProfileRow({ user, fullNameOverride }: EnsureProfileInput) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminSupabase();
  await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? 'unknown',
      full_name: deriveName(user, fullNameOverride),
    },
    { onConflict: 'id' }
  );
}
