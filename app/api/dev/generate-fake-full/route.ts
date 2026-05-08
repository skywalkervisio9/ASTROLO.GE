// ============================================================
// POST /api/dev/generate-fake-full
//
// Dev-only "CALL1 PREMIUM" path. Runs the real (cheap) Call 1 chart analysis
// and clones another user's already-generated reading_ka / reading_en as the
// fake Call 2 — stamped with a "🔁 FAKE" marker on every section so a test
// user sees the full premium layout/content shape without spending Call 2
// tokens or waiting 5 min.
//
// Side effects:
//   - account_type → 'premium', natal_chart_unlocked → true
//   - natal_readings row upserted with the cloned-and-stamped reading
//   - public-share cache invalidated
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall1 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { getAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { markReadingAsFakeCopy } from '@/lib/AIgeneration/fake-reading';
import {
  invalidatePublicReadingByUser,
  invalidateUserProfile,
} from '@/lib/data/public-reading';
import {
  buildPlanetTableForReading,
  mergeAspectsForReading,
  injectAndClean,
  generateShareSlug,
  type StoredPlanet,
  type StoredPoints,
  type StoredAspect,
} from '@/lib/chart/reading-helpers';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEV_PASSWORD = 'astrolo';
const isDevAllowed = (req: NextRequest) =>
  process.env.NODE_ENV !== 'production' ||
  req.headers.get('x-dev-password') === DEV_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    if (!isDevAllowed(req)) {
      return NextResponse.json({ error: 'Dev-only endpoint' }, { status: 403 });
    }
    await requireCsrfOrThrow();

    const { authUser } = await getAuthContext();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabase();

    const { data: chartRow } = await admin
      .from('chart_data')
      .select('chart_context, planets, points, aspects')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!chartRow?.chart_context) {
      return NextResponse.json(
        { error: 'Chart data not found — complete onboarding first' },
        { status: 400 },
      );
    }

    // Promote to premium so the natal route's tier gate passes.
    await admin
      .from('users')
      .update({ account_type: 'premium', natal_chart_unlocked: true })
      .eq('id', authUser.id);
    invalidateUserProfile(authUser.id);

    // Reuse cached Call 1 analysis if present — keeps the dev button cheap on
    // repeat clicks. Otherwise run real Call 1 (~30s, low token cost).
    const { data: existing } = await admin
      .from('natal_readings')
      .select('id, analysis_en, model_call1, tokens_call1, share_slug')
      .eq('user_id', authUser.id)
      .maybeSingle();

    let analysis = existing?.analysis_en ?? '';
    let call1Model = existing?.model_call1 ?? 'cached';
    let call1Tokens = existing?.tokens_call1 ?? 0;

    if (!analysis) {
      const call1 = await runNatalCall1(chartRow.chart_context);
      analysis = call1.analysis;
      call1Model = call1.model;
      call1Tokens = call1.tokens;
    }

    // Pull a real previously-generated reading from any other user as the
    // clone source. KA + EN must both exist on the same row so the language
    // toggle stays consistent.
    const { data: sample } = await admin
      .from('natal_readings')
      .select('reading_ka, reading_en')
      .neq('user_id', authUser.id)
      .not('reading_ka', 'is', null)
      .not('reading_en', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!sample?.reading_ka || !sample?.reading_en) {
      return NextResponse.json(
        { error: 'No completed reading exists in the DB to clone from. Run a real generation first.' },
        { status: 400 },
      );
    }

    const fakeKa = markReadingAsFakeCopy(sample.reading_ka as Record<string, unknown>, 'ka');
    const fakeEn = markReadingAsFakeCopy(sample.reading_en as Record<string, unknown>, 'en');
    if (!fakeKa || !fakeEn) {
      return NextResponse.json({ error: 'Failed to clone source reading' }, { status: 500 });
    }

    const storedPlanets = chartRow.planets as StoredPlanet[] | null;
    const storedPoints = chartRow.points as StoredPoints | null;
    const storedAspects = chartRow.aspects as StoredAspect[] | null;

    // Inject the current user's real chart_data into overview so the planet
    // table + aspects match this user even though card text is the clone's.
    const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
    const aspectsKa = mergeAspectsForReading(storedAspects, []);
    const aspectsEn = mergeAspectsForReading(storedAspects, []);

    const finalReadingKa = injectAndClean(fakeKa, planetTable, aspectsKa);
    const finalReadingEn = injectAndClean(fakeEn, planetTable, aspectsEn);

    const shareSlug = existing?.share_slug ?? generateShareSlug();

    const { data: saved, error: saveError } = await admin
      .from('natal_readings')
      .upsert({
        user_id: authUser.id,
        share_slug: shareSlug,
        analysis_en: analysis,
        reading_ka: finalReadingKa,
        reading_en: finalReadingEn,
        prompt_version: `${PROMPT_VERSION}-fake`,
        model_call1: call1Model,
        model_call2: 'fake',
        tokens_call1: call1Tokens,
        tokens_call2_ka: 0,
        tokens_call2_en: 0,
        validation_warnings: ['DEV FAKE READING — cloned from another user, Call 2 skipped'],
      }, { onConflict: 'user_id' })
      .select('id, share_slug')
      .single();

    if (saveError) throw saveError;

    await invalidatePublicReadingByUser(authUser.id);

    return NextResponse.json({
      ok: true,
      status: 'complete',
      readingId: saved?.id,
      shareSlug: saved?.share_slug,
      fake: true,
    });
  } catch (error: unknown) {
    console.error('[generate-fake-full] error:', error);
    return jsonServerError(error);
  }
}
