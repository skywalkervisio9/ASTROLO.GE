// ============================================================
// /r/[slug]/opengraph-image.tsx — dynamic 1200x630 share thumbnail.
// Next.js App Router convention: this file auto-wires into the
// <meta property="og:image"> for the route.
// ============================================================

import { ImageResponse } from 'next/og';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = { width: 1200, height: 630 };
export const alt = 'ASTROLO.GE Natal Reading';

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Params) {
  const { slug } = await params;
  const admin = createAdminSupabase();

  const { data: row } = await admin
    .from('natal_readings')
    .select('user_id, is_public, reading_ka, reading_en')
    .eq('share_slug', slug)
    .maybeSingle();

  let name = 'ASTROLO.GE';
  let tagline = 'Your Astrological Reading';

  if (row?.is_public) {
    const { data: profile } = await admin
      .from('users')
      .select('full_name')
      .eq('id', row.user_id)
      .maybeSingle();
    if (profile?.full_name) name = profile.full_name;
    const reading = (row.reading_ka ?? row.reading_en) as
      | { overview?: { sectionTagline?: string } }
      | null;
    if (reading?.overview?.sectionTagline) tagline = reading.overview.sectionTagline;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #0a0a1e 0%, #1a0f2e 50%, #0a0a1e 100%)',
          color: '#f5d98a',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 36,
            letterSpacing: '0.3em',
            color: '#d4af6d',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          ASTROLO.GE
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            color: '#f5d98a',
            marginBottom: 24,
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#c8b27a',
            maxWidth: 900,
            lineHeight: 1.3,
            opacity: 0.9,
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
