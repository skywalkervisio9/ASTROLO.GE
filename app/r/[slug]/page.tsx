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
import PrototypeClient from '@/components/PrototypeClient';
import PublicReadingClient from '@/components/PublicReadingClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Server-rendered metadata for social share previews (FB, WhatsApp, X, etc).
// Backed by the per-slug Data Cache; first hit fills, repeats are free.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getReadingMeta(slug);

  if (!meta || !meta.is_public) {
    return { title: 'ASTROLO.GE', robots: { index: false, follow: false } };
  }

  const tagline = meta.tagline_ka || meta.tagline_en || 'ასტროლოგიური ანალიზი';
  const name = meta.owner_full_name?.trim() || '';
  const title = name ? `${name} — ASTROLO.GE` : 'ASTROLO.GE';

  return {
    title,
    description: tagline,
    openGraph: {
      title,
      description: tagline,
      type: 'article',
      siteName: 'ASTROLO.GE',
      // opengraph-image.tsx in the same route segment supplies the image.
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: tagline,
    },
  };
}

export default async function ReadingPage({ params }: Props) {
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
    // Owner gets the full interactive app (sidebar, language toggle,
    // synastry, upgrade CTAs, settings). PrototypeClient already
    // handles auth-based hydration.
    return <PrototypeClient />;
  }

  // Guest on a public reading → read-only view.
  return <PublicReadingClient slug={slug} />;
}
