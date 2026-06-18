import type { User } from '@supabase/supabase-js';
import { createAdminSupabase } from '@/lib/supabase/admin';

type EnsureProfileInput = {
  user: User;
  fullNameOverride?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  birthYear?: number | null;
};

function deriveName(user: User, fullNameOverride?: string | null) {
  return fullNameOverride
    || (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null)
    || (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null)
    || user.email?.split('@')[0]
    || 'User';
}

export async function ensureUserProfileRow({
  user,
  fullNameOverride,
  birthDay,
  birthMonth,
  birthYear,
}: EnsureProfileInput) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminSupabase();

  // Only seed DOB columns when the row doesn't already have them set —
  // a returning Google user who has since edited their birth data in the
  // app must not get clobbered by stale Google profile values.
  const hasDob = birthDay != null || birthMonth != null || birthYear != null;
  let seedDob: { birth_day?: number; birth_month?: number; birth_year?: number } = {};
  if (hasDob) {
    const { data: existing } = await admin
      .from('users')
      .select('birth_day, birth_month, birth_year')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.birth_day == null && birthDay != null) seedDob.birth_day = birthDay;
    if (existing?.birth_month == null && birthMonth != null) seedDob.birth_month = birthMonth;
    if (existing?.birth_year == null && birthYear != null) seedDob.birth_year = birthYear;
  }

  await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? 'unknown',
      full_name: deriveName(user, fullNameOverride),
      ...seedDob,
    },
    { onConflict: 'id' }
  );
}
