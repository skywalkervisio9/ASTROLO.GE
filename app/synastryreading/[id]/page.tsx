// ============================================================
// /synastryreading/[id] — legacy connection UUID → canonical /s/{slug}
// ============================================================

import { redirect } from 'next/navigation';
import { createAdminSupabase } from '@/lib/supabase/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacySynastryReadingPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminSupabase();
  const { data } = await admin
    .from('synastry_readings')
    .select('share_slug')
    .eq('connection_id', id)
    .maybeSingle();

  if (!data?.share_slug) {
    redirect('/');
  }

  redirect(`/s/${encodeURIComponent(data.share_slug as string)}`);
}
