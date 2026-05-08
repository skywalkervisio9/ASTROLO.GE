import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { ensureUserProfileRow } from '@/lib/auth/profile';
import { normalizeInviteCode } from '@/lib/utils/invite';

function pickInvite(sp: Record<string, string | string[] | undefined>): string | undefined {
  const v = sp.invite;
  if (typeof v === 'string' && v) return normalizeInviteCode(v);
  if (Array.isArray(v) && typeof v[0] === 'string') return normalizeInviteCode(v[0]);
  return undefined;
}

export default async function PostAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const invite = pickInvite(sp);
  // `?new=1` is set by client-side signup — the user was just created, so we
  // already know they have no birth data and no reading. Skip the extra DB
  // round-trips and send them straight to the birth form.
  const isNew = sp.new === '1';

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Stale auth cookies (e.g. deleted user) — clear them before bouncing.
    // Without this, AuthBridge on /auth reads the same cookies via getSession()
    // and redirects back here, looping forever.
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    redirect(invite ? `/auth?invite=${encodeURIComponent(invite)}` : '/auth');
  }

  await ensureUserProfileRow({ user });

  if (isNew) {
    redirect(invite ? `/auth?step=birth&invite=${encodeURIComponent(invite)}` : '/auth?step=birth');
  }

  // If profile row isn't there yet (or RLS blocks read), treat as "needs onboarding".
  const { data: profile } = await supabase
    .from('users')
    .select('birth_day, birth_year')
    .eq('id', user.id)
    .maybeSingle();

  const hasBirth = !!(profile?.birth_day && profile?.birth_year);

  // If a reading already exists, take them to the canonical /r/[slug] URL.
  const { data: readingRow } = await supabase
    .from('natal_readings')
    .select('id, share_slug')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readingRow?.share_slug) {
    // Must hit /loading so client POST /api/invite/accept runs before natal redirect.
    redirect(
      invite
        ? `/loading?invite=${encodeURIComponent(invite)}`
        : `/r/${readingRow.share_slug}`,
    );
  }
  if (readingRow?.id) {
    // Legacy row missing a slug — fall through to loading so it gets one.
  }

  // New user (or missing birth data): go to birth data input.
  if (!hasBirth) {
    redirect(invite ? `/auth?step=birth&invite=${encodeURIComponent(invite)}` : '/auth?step=birth');
  }

  // Has birth data but no reading yet: go to loading and generate/poll.
  redirect(invite ? `/loading?invite=${encodeURIComponent(invite)}` : '/loading');
}

