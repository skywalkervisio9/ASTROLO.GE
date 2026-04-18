// ============================================================
// GET /api/reading/public?slug=xxx&lang=ka — Public reading (no auth required)
// Returns full reading without tier gating (public share view)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { buildStaticReading } from '@/lib/chart/static-reading';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const admin = createAdminSupabase();

    // Fetch reading by share_slug
    const { data: row, error } = await admin
      .from('natal_readings')
      .select('reading_ka, reading_en, user_id, is_public')
      .eq('share_slug', slug)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    // Private readings are not served via the public endpoint.
    // The page-level route (/r/[slug]) handles the redirect for UI;
    // this guard protects direct API hits.
    if (!row.is_public) {
      return NextResponse.json({ error: 'Reading is private' }, { status: 403 });
    }

    // Inject chart data (planet table, aspects, points) into overview
    const { data: chartRow } = await admin
      .from('chart_data')
      .select('planets, aspects, points')
      .eq('user_id', row.user_id)
      .maybeSingle();

    let reading = (lang === 'ka' ? row.reading_ka : row.reading_en) as Record<string, unknown> | null;

    if (reading && chartRow && reading.overview && typeof reading.overview === 'object') {
      const overview = reading.overview as Record<string, unknown>;
      if (!overview.planetTable && chartRow.planets) overview.planetTable = chartRow.planets;
      if (!overview.aspects && chartRow.aspects) overview.aspects = chartRow.aspects;
      if (!overview.points && chartRow.points) overview.points = chartRow.points;
    } else if (!reading) {
      // Free user: no AI reading yet — build static reading from chart data
      reading = buildStaticReading(lang, chartRow);
    }

    // Fetch user profile for display (name, account_type)
    const { data: profile } = await admin
      .from('users')
      .select('id, full_name, email, account_type, natal_chart_unlocked')
      .eq('id', row.user_id)
      .single();

    return NextResponse.json({
      reading,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        account_type: profile.account_type,
        natal_chart_unlocked: profile.natal_chart_unlocked ?? false,
      } : null,
      isPublic: true,
    });
  } catch (error: unknown) {
    console.error('Public reading error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
