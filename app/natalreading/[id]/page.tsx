import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import NatalReadingClient from '@/components/NatalReadingClient';

export default async function NatalReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  // Only allow viewing your own reading in this app
  if (user.id !== id) {
    redirect('/auth');
  }

  return <NatalReadingClient userId={id} />;
}

