// ============================================================
// /r/[slug]/share-image/[lang] — localized 1200x630 natal share
// thumbnail. A route handler (not the opengraph-image convention)
// so the language is a real path param: the page's generateMetadata
// points og:image/twitter:image at the ka or en variant.
// ============================================================

import { getReadingMeta } from '@/lib/data/public-reading';
import { renderNatalCard, resolveOgLang, OG_CONTENT_TYPE } from '@/lib/og/share-image';

// Node runtime: brand + Georgian fonts are read from disk (fs).
export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string; lang: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, lang } = await params;
  const meta = await getReadingMeta(slug);

  let name = 'ASTROLO.GE';
  let sunSign: string | null = null;
  let moonSign: string | null = null;

  if (meta?.is_public) {
    if (meta.owner_full_name) name = meta.owner_full_name;
    sunSign = meta.sun_sign;
    moonSign = meta.moon_sign;
  }

  const res = await renderNatalCard({ name, sunSign, moonSign, lang: resolveOgLang(lang) });
  res.headers.set('Content-Type', OG_CONTENT_TYPE);
  return res;
}
