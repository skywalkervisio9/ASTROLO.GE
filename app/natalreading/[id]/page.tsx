// ============================================================
// /natalreading/[id] — legacy URL, redirects to canonical /r/[slug]
// Kept so any stored bookmarks / external links keep working.
// ============================================================

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export default async function NatalReadingLegacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Only the owner can resolve a legacy /natalreading/{userId} URL.
  if (user.id !== id) redirect('/auth');

  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from('natal_readings')
    .select('share_slug')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row?.share_slug) redirect('/auth');

  redirect(`/r/${row.share_slug}`);
}
