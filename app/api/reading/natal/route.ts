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
//
// Backed by per-userId Data Cache (lib/data/natal-reading.ts) so repeat
// hits — including language toggle — skip Supabase entirely.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { buildStaticReading } from '@/lib/chart/static-reading';
import {
  getNatalChartByUser,
  getNatalReadingByUser,
} from '@/lib/data/natal-reading';
import { getUserProfileForReading } from '@/lib/data/public-reading';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { authUser } = auth;

    const url = new URL(req.url);
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    // All three reads hit the Data Cache; on warm hits this is microseconds.
    const [profile, chartRow, readingBody] = await Promise.all([
      getUserProfileForReading(authUser.id),
      getNatalChartByUser(authUser.id),
      getNatalReadingByUser(authUser.id),
    ]);

    // Profile may be missing briefly for brand-new OAuth users.
    if (!profile) {
      return NextResponse.json({ reading: null, hasFullReading: false });
    }

    // No chart yet → user hasn't completed DOB entry. Returning a static reading
    // here would cause HydrationBridge to force-switch the view to "natal" and
    // hide the /auth?step=birth onboarding form.
    if (!chartRow) {
      return NextResponse.json({ reading: null, hasFullReading: false });
    }

    const fullUnlocked =
      profile.account_type === 'premium' || profile.natal_chart_unlocked;

    // ── FREE / INVITED: no AI reading — return static placeholder ──
    if (!fullUnlocked) {
      const staticReading = buildStaticReading(lang, chartRow);
      return NextResponse.json({ reading: staticReading, hasFullReading: false });
    }

    // ── PREMIUM: return full AI reading ──
    if (!readingBody?.reading_ka) {
      // Full reading not generated yet (e.g. payment just completed, still generating)
      return NextResponse.json({ reading: null, hasFullReading: true });
    }

    const full = (lang === 'ka' ? readingBody.reading_ka : readingBody.reading_en) as
      | Record<string, unknown>
      | null;
    if (!full) {
      return NextResponse.json({ reading: null, hasFullReading: true });
    }

    // Inject chart_data into the overview section
    if (full.overview && typeof full.overview === 'object') {
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
