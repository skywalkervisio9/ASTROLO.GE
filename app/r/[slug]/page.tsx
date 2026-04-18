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
import { createAdminSupabase } from '@/lib/supabase/admin';
import PrototypeClient from '@/components/PrototypeClient';
import PublicReadingClient from '@/components/PublicReadingClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Server-rendered metadata for social share previews (FB, WhatsApp, X, etc).
// Runs at request time on first hit, then cached by Next.js.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminSupabase();

  const { data: row } = await admin
    .from('natal_readings')
    .select('reading_ka, reading_en, user_id, is_public')
    .eq('share_slug', slug)
    .maybeSingle();

  if (!row || !row.is_public) {
    return { title: 'ASTROLO.GE', robots: { index: false, follow: false } };
  }

  const { data: profile } = await admin
    .from('users')
    .select('full_name')
    .eq('id', row.user_id)
    .maybeSingle();

  const reading = (row.reading_ka ?? row.reading_en) as
    | { overview?: { sectionTagline?: string } }
    | null;
  const tagline = reading?.overview?.sectionTagline?.trim() || 'ასტროლოგიური ანალიზი';
  const name = profile?.full_name?.trim() || '';
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

  // Admin lookup so we can read is_public/user_id even if the viewer
  // has no session (RLS would otherwise block a private row).
  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from('natal_readings')
    .select('user_id, is_public')
    .eq('share_slug', slug)
    .maybeSingle();

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
