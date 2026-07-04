// ============================================================
// /s/[slug]/share-image/[lang] — localized 1200x630 synastry share
// thumbnail. Route handler so the language is a real path param;
// the page's generateMetadata points og:image at the ka or en variant.
// ============================================================

import { getSynastryMeta } from '@/lib/data/public-synastry';
import { renderSynastryCard, resolveOgLang, OG_CONTENT_TYPE } from '@/lib/og/share-image';

// Node runtime: brand + Georgian fonts are read from disk (fs).
export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string; lang: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, lang } = await params;
  const ogLang = resolveOgLang(lang);
  const meta = await getSynastryMeta(slug);

  let pair = 'Synastry';
  let score: number | null = null;

  if (meta?.is_public) {
    pair = (ogLang === 'en' ? meta.title_en || meta.title_ka : meta.title_ka || meta.title_en) || pair;
    score = meta.compatibility_score;
  }

  const res = await renderSynastryCard({ pair, score, lang: ogLang });
  res.headers.set('Content-Type', OG_CONTENT_TYPE);
  return res;
}
