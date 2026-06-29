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
  type SingleLangInterp,
} from '@/lib/chart/reading-helpers';

/**
 * Aspect interpretations for the fake reading. The cloned source reading already
 * holds real, AI-written aspect prose in overview.aspects — reuse it, mapped onto
 * THIS user's aspects positionally (the source chart differs, so an exact planet
 * match isn't possible). Falls back to a clearly-marked placeholder so the
 * aspect-interpretation UI always renders in dev, even if the source had none.
 */
function buildFakeAspectInterps(
  fake: Record<string, unknown> | null,
  storedAspects: StoredAspect[] | null,
  lang: 'ka' | 'en',
): SingleLangInterp[] {
  if (!storedAspects || storedAspects.length === 0) return [];
  const overview = (fake?.overview ?? {}) as Record<string, unknown>;
  const src = Array.isArray(overview.aspects) ? (overview.aspects as Array<Record<string, unknown>>) : [];
  const prose = src
    .map((a) => ({
      interpretation: typeof a?.interpretation === 'string' ? a.interpretation.trim() : '',
      significance: a?.significance === 'high' ? ('high' as const) : ('normal' as const),
    }))
    .filter((p) => p.interpretation.length > 0);

  const placeholder = (asp: string) =>
    lang === 'ka'
      ? `🔁 FAKE — ${asp}: სატესტო ინტერპრეტაცია ასპექტების ბლოკის გასამართად. რეალურ წაკითხვაში აქ AI-ის ანალიზი იქნება.`
      : `🔁 FAKE — ${asp}: placeholder interpretation to exercise the aspect block. A real reading shows AI analysis here.`;

  return storedAspects.map((a, i) => {
    const p = prose.length > 0 ? prose[i % prose.length] : null;
    return {
      planet1: a.planet1,
      planet2: a.planet2,
      aspect: a.aspect,
      interpretation: p ? p.interpretation : placeholder(a.aspect),
      significance: p ? p.significance : ('normal' as const),
    };
  });
}

export const runtime = 'nodejs';
export const maxDuration = 600;

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
    const aspectsKa = mergeAspectsForReading(storedAspects, buildFakeAspectInterps(fakeKa, storedAspects, 'ka'));
    const aspectsEn = mergeAspectsForReading(storedAspects, buildFakeAspectInterps(fakeEn, storedAspects, 'en'));

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
