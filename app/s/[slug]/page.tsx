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
import { requestOrigin, resolveShareLang, shareImageMetadata } from '@/lib/og/metadata';
import PublicSynastryClient from '@/components/PublicSynastryClient';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const meta = await getSynastryMeta(slug);

  if (!meta || !meta.is_public) {
    return { title: 'ASTROLO.GE', robots: { index: false, follow: false } };
  }

  const lang = resolveShareLang(langParam, meta.owner_language);
  const titleLine =
    (lang === 'en' ? meta.title_en || meta.title_ka : meta.title_ka || meta.title_en) || 'Synastry';
  const compatWord = lang === 'ka' ? 'თავსებადობა' : 'compatibility';
  const subtitle =
    meta.compatibility_score != null
      ? `${titleLine} — ${meta.compatibility_score}% ${compatWord}`
      : titleLine;

  const origin = await requestOrigin();
  const title = `${titleLine} — ASTROLO.GE`;
  return {
    title,
    description: subtitle,
    ...shareImageMetadata(
      `${origin}/s/${slug}/share-image/${lang}`,
      title,
      subtitle,
      'ASTROLO.GE Synastry Reading',
    ),
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
