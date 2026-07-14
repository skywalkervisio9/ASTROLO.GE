// ============================================================
// GET /api/dev/synastry-reading?connection=<id>&lang=en
// Dev-only. Returns a stored synastry reading (+ both charts) so the
// /synastry-preview page can render a REAL generated reading in the
// redesigned UI without the public-visibility / auth flow.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

const DEV_PASSWORD = 'astrolo';
const isDevAllowed = (req: NextRequest) =>
  process.env.NODE_ENV !== 'production' ||
  req.headers.get('x-dev-password') === DEV_PASSWORD;

export async function GET(req: NextRequest) {
  if (!isDevAllowed(req)) {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const url = new URL(req.url);
  const connectionId = url.searchParams.get('connection');
  const lang = url.searchParams.get('lang') === 'ka' ? 'ka' : 'en';
  if (!connectionId) {
    return NextResponse.json({ error: 'connection required' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: row, error } = await admin
    .from('synastry_readings')
    .select('reading_en, reading_ka, user1_id, user2_id, compatibility_score, category_scores')
    .eq('connection_id', connectionId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
  }

  const reading = lang === 'ka' ? row.reading_ka : row.reading_en;

  const { data: charts } = await admin
    .from('chart_data')
    .select('user_id, planets, points')
    .in('user_id', [row.user1_id, row.user2_id]);

  const chartFor = (userId: string) => {
    const c = charts?.find((x) => x.user_id === userId);
    if (!c) return null;
    return {
      planets: (typeof c.planets === 'string' ? JSON.parse(c.planets) : c.planets) ?? null,
      points: (typeof c.points === 'string' ? JSON.parse(c.points) : c.points) ?? null,
    };
  };

  return NextResponse.json({
    reading,
    chartA: chartFor(row.user1_id),
    chartB: chartFor(row.user2_id),
    // Surface the model's raw numbers so the caller can compare them against
    // the UI's code-derived overall.
    aiCompatibilityScore: row.compatibility_score,
    categoryScores: row.category_scores,
  });
}
