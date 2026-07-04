// ============================================================
// /r/[slug] — Unified reading URL (owner + guest)
//
// Server component fetches the reading by slug, checks session,
// and branches:
//   - Owner           → PrototypeClient (full interactive app)
//   - Guest + public  → PublicReadingClient (read-only view)
//   - Guest + private → /auth?error=private
// ============================================================

import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  getReadingMeta,
  getReadingOwnership,
} from '@/lib/data/public-reading';
import { requestOrigin, resolveShareLang, shareImageMetadata } from '@/lib/og/metadata';
import { computeOnboardingStatus } from '@/lib/onboarding/status';
import PrototypeClient from '@/components/PrototypeClient';
import PublicReadingClient from '@/components/PublicReadingClient';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Server-rendered metadata for social share previews (FB, WhatsApp, X, etc).
// Backed by the per-slug Data Cache; first hit fills, repeats are free.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const meta = await getReadingMeta(slug);

  if (!meta || !meta.is_public) {
    return { title: 'ASTROLO.GE', robots: { index: false, follow: false } };
  }

  const lang = resolveShareLang(langParam, meta.owner_language);
  const tagline =
    (lang === 'en' ? meta.tagline_en || meta.tagline_ka : meta.tagline_ka || meta.tagline_en) ||
    (lang === 'en' ? 'Astrological analysis' : 'ასტროლოგიური ანალიზი');
  const name = meta.owner_full_name?.trim() || '';
  const title = name ? `ASTROLO.GE — ${name}` : 'ASTROLO.GE';

  const origin = await requestOrigin();
  return {
    title,
    description: tagline,
    ...shareImageMetadata(
      `${origin}/r/${slug}/share-image/${lang}`,
      title,
      tagline,
      'ASTROLO.GE Natal Reading',
    ),
  };
}

export default async function ReadingPage({ params, searchParams }: Props) {
  const { slug } = await params;

  // Cached ownership lookup — no DB hit on repeat visits to the same slug.
  const row = await getReadingOwnership(slug);
  if (!row) notFound();

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === row.user_id;

  if (!isOwner && !row.is_public) {
    redirect('/auth?error=private');
  }

  if (isOwner) {
    // Reloading (or logging in from another device) while the owner's reading
    // is still generating must land on /loading, not on a stale/partial
    // reading. Synastry flows are excluded: the invite path intentionally
    // parks the user on /r/[slug]?synastry=1 while Call 1 runs in the
    // background — the synastry view's cosmic loader owns that wait.
    const sp = await searchParams;
    if (!('synastry' in sp)) {
      const st = await computeOnboardingStatus(user.id);
      if (st.status === 'generating') {
        // resume = watch + poll only; never re-fires the AI calls.
        redirect('/loading?mode=resume');
      }
      if (st.status === 'queued') {
        // chart_data missing (e.g. interrupted onboarding or DOB correction) —
        // plain /loading rebuilds the chart from the pending payload/profile.
        redirect('/loading');
      }
    }

    // Owner gets the full interactive app (sidebar, language toggle,
    // synastry, upgrade CTAs, settings). PrototypeClient already
    // handles auth-based hydration.
    return <PrototypeClient />;
  }

  // Guest on a public reading → read-only view.
  return <PublicReadingClient slug={slug} />;
}
