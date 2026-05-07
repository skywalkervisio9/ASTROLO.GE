// ============================================================
// /s/[slug] — Public or participant synastry share URL
// ============================================================

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  getSynastryOwnership,
  getSynastryMeta,
} from '@/lib/data/public-synastry';
import PublicSynastryClient from '@/components/PublicSynastryClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getSynastryMeta(slug);

  if (!meta || !meta.is_public) {
    return { title: 'ASTROLO.GE', robots: { index: false, follow: false } };
  }

  const titleLine = meta.title_en || meta.title_ka || 'Synastry';
  const subtitle =
    meta.compatibility_score != null
      ? `${titleLine} — ${meta.compatibility_score}% compatibility`
      : titleLine;

  return {
    title: `${titleLine} — ASTROLO.GE`,
    description: subtitle,
    openGraph: {
      title: `${titleLine} — ASTROLO.GE`,
      description: subtitle,
      type: 'article',
      siteName: 'ASTROLO.GE',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titleLine} — ASTROLO.GE`,
      description: subtitle,
    },
  };
}

export default async function SynastrySharePage({ params }: Props) {
  const { slug } = await params;
  const row = await getSynastryOwnership(slug);
  if (!row) notFound();

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isParticipant =
    !!user &&
    (user.id === row.user1_id ||
      user.id === row.user2_id);

  if (!row.is_public && !isParticipant) {
    redirect('/auth?error=private');
  }

  return (
    <PublicSynastryClient slug={slug} viewerIsParticipant={isParticipant} />
  );
}
