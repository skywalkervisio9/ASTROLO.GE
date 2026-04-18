// ============================================================
// GET /api/reading/natal — Tier-aware natal reading
//
// Free/invited (no full reading):
//   Returns chart_data (planet table + aspects) as the overview
//   plus static placeholder sections for all 8 keys.
//   { reading: staticReading, hasFullReading: false }
//
// Premium / natal_chart_unlocked:
//   Returns the full AI reading with chart_data injected into overview.
//   { reading: full, hasFullReading: true }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types/user';
import { hasFullReading } from '@/types/user';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { buildStaticReading } from '@/lib/chart/static-reading';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const url = new URL(req.url);
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    // Profile may be missing briefly for brand-new OAuth users.
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ reading: null, hasFullReading: false });
    }

    const user = profile as User;

    // Always load chart_data — needed for overview planet table regardless of tier
    const { data: chartRow } = await supabase
      .from('chart_data')
      .select('planets, aspects, points')
      .eq('user_id', authUser.id)
      .maybeSingle();

    // No chart yet → user hasn't completed DOB entry. Returning a static reading
    // here would cause HydrationBridge to force-switch the view to "natal" and
    // hide the /auth?step=birth onboarding form.
    if (!chartRow) {
      return NextResponse.json({ reading: null, hasFullReading: false });
    }

    // ── FREE / INVITED: no AI reading — return static placeholder ──
    if (!hasFullReading(user)) {
      const staticReading = buildStaticReading(lang, chartRow);
      return NextResponse.json({ reading: staticReading, hasFullReading: false });
    }

    // ── PREMIUM: return full AI reading ──
    const { data: row } = await supabase
      .from('natal_readings')
      .select('reading_ka, reading_en')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!row?.reading_ka) {
      // Full reading not generated yet (e.g. payment just completed, still generating)
      return NextResponse.json({ reading: null, hasFullReading: true });
    }

    const full = (lang === 'ka' ? row.reading_ka : row.reading_en) as Record<string, unknown>;

    // Inject chart_data into the overview section
    if (chartRow && full.overview && typeof full.overview === 'object') {
      const overview = full.overview as Record<string, unknown>;
      if (!overview.planetTable && chartRow.planets) overview.planetTable = chartRow.planets;
      if (!overview.aspects && chartRow.aspects)     overview.aspects = chartRow.aspects;
      if (!overview.points && chartRow.points)       overview.points = chartRow.points;
    }

    return NextResponse.json({ reading: full, hasFullReading: true });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
