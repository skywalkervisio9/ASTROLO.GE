// ============================================================
// GET /api/reading/public?slug=xxx&lang=ka — Public reading (no auth required)
// Returns full reading without tier gating (public share view)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPublicReadingFull } from '@/lib/data/public-reading';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const result = await getPublicReadingFull(slug, lang);

    if ('error' in result) {
      if (result.error === 'not_found') {
        return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
      }
      // 'private' — protect direct API hits; UI redirect happens in /r/[slug].
      return NextResponse.json({ error: 'Reading is private' }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Public reading error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
