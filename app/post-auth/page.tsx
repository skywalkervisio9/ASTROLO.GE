import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { ensureUserProfileRow } from '@/lib/auth/profile';

export default async function PostAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const invite = typeof sp.invite === 'string' ? sp.invite : undefined;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(invite ? `/auth?invite=${invite}` : '/auth');
  }

  await ensureUserProfileRow({ user });

  // If profile row isn't there yet (or RLS blocks read), treat as "needs onboarding".
  const { data: profile } = await supabase
    .from('users')
    .select('birth_day, birth_year')
    .eq('id', user.id)
    .maybeSingle();

  const hasBirth = !!(profile?.birth_day && profile?.birth_year);

  // If a reading already exists, take them to their natal reading route.
  const { data: readingRow } = await supabase
    .from('natal_readings')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readingRow?.id) {
    redirect(`/natalreading/${user.id}`);
  }

  // New user (or missing birth data): go to birth data input.
  if (!hasBirth) {
    redirect(invite ? `/auth?step=birth&invite=${invite}` : '/auth?step=birth');
  }

  // Has birth data but no reading yet: go to loading and generate/poll.
  redirect(invite ? `/loading?invite=${invite}` : '/loading');
}

