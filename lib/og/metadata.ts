// ============================================================
// Metadata helpers for language-aware OG share images.
// The thumbnail language is decided server-side (crawlers read the
// static meta tag), so generateMetadata resolves it here and points
// og:image / twitter:image at the matching /share-image/[lang] route.
// ============================================================

import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { OgLang } from '@/lib/og/signs';

/** Absolute origin the page was requested on (so the OG image is on the same
 *  host the user shared). Falls back to env/localhost when headers are absent. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host');
  if (!host) {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'http://localhost:3000'
    );
  }
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Resolve the share-card language: explicit `?lang=` (set by the share button
 *  from the current toggle) → owner account language → Georgian default. */
export function resolveShareLang(
  param: string | string[] | undefined,
  ownerLanguage: string | null | undefined,
): OgLang {
  const p = Array.isArray(param) ? param[0] : param;
  if (p === 'en' || p === 'ka') return p;
  if (ownerLanguage === 'en') return 'en';
  return 'ka';
}

/** openGraph + twitter blocks pointing at the localized share image. */
export function shareImageMetadata(
  imageUrl: string,
  title: string,
  description: string,
  alt: string,
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = { url: imageUrl, width: 1200, height: 630, alt };
  return {
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'ASTROLO.GE',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}
