// ============================================================
// POST /api/reading/generate-full
// Triggered post-payment (or dev mode premium button).
// Runs Call 1 (if not already done) + Call 2 KA+EN → full natal reading.
// User must have account_type = 'premium' or natal_chart_unlocked = true.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall2 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { hasFullReading } from '@/types/user';
import type { User } from '@/types/user';
import { invalidatePublicReadingByUser } from '@/lib/data/public-reading';
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
// 600s ceiling (Pro + Fluid Compute, max 800s). KA Call 2 measured ~168s; this
// leaves headroom for a top-up pass or a single retry without a timeout kill.
export const maxDuration = 600;

export async function POST() {
  // Hoisted so the catch can record a durable 'failed' state (Tier 2).
  let userId: string | null = null;
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { authUser } = auth;
    userId = authUser.id;
    const admin = createAdminSupabase();

    // Load full profile to check tier
    const { data: profile } = await admin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const user = profile as User;

    if (!hasFullReading(user)) {
      return NextResponse.json({ error: 'Full reading not unlocked' }, { status: 403 });
    }

    // Check if full reading already exists (idempotent)
    const { data: existingReading } = await admin
      .from('natal_readings')
      .select('id, reading_ka, share_slug')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existingReading?.reading_ka) {
      return NextResponse.json({ status: 'complete', readingId: existingReading.id });
    }

    // Load chart_data (required)
    const { data: chartRow } = await admin
      .from('chart_data')
      .select('chart_context, planets, points, aspects')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!chartRow?.chart_context) {
      return NextResponse.json({ error: 'Chart data not found — complete onboarding first' }, { status: 400 });
    }

    const context: string = chartRow.chart_context;
    const storedPlanets = chartRow.planets as StoredPlanet[] | null;
    const storedPoints = chartRow.points as StoredPoints | null;
    const storedAspects = chartRow.aspects as StoredAspect[] | null;

    // Call 1 must already exist — run /api/reading/generate-call1 first
    const { data: analysisRow } = await admin
      .from('natal_readings')
      .select('analysis_en, model_call1, tokens_call1')
      .eq('user_id', authUser.id)
      .maybeSingle();

    const analysis = analysisRow?.analysis_en ?? '';
    const call1Model = analysisRow?.model_call1 ?? 'cached';
    const call1Tokens = analysisRow?.tokens_call1 ?? 0;

    if (!analysis) {
      return NextResponse.json({ error: 'Call 1 analysis not found — call /api/reading/generate-call1 first' }, { status: 400 });
    }

    // Tier-2: mark generation underway. A hard kill (300s timeout) then leaves
    // a detectable 'generating' row for the recovery sweep, and the status
    // endpoint can tell in-progress apart from failed.
    await admin
      .from('natal_readings')
      .update({
        generation_status: 'generating',
        generation_started_at: new Date().toISOString(),
        generation_finished_at: null,
      })
      .eq('user_id', authUser.id);

    try {
      // Call 2: KA + EN in parallel
      const call2 = await runNatalCall2(analysis, context, storedAspects ?? undefined);

      // Inject chart_data into readings
      const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
      const aspectsKa = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsKa);
      const aspectsEn = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsEn);

      const finalReadingKa = injectAndClean(call2.readingKa, planetTable, aspectsKa);
      const finalReadingEn = injectAndClean(call2.readingEn, planetTable, aspectsEn);

      // Preserve the slug the user already has (e.g. from the free path) so
      // any previously shared links keep working. Only mint a new one if there
      // isn't one yet.
      const shareSlug = existingReading?.share_slug ?? generateShareSlug();

      // Upsert — works for both new rows (free→premium) and existing rows (invited→invited+)
      const { data: saved, error: saveError } = await admin
        .from('natal_readings')
        .upsert({
          user_id: authUser.id,
          share_slug: shareSlug,
          analysis_en: analysis,
          reading_ka: finalReadingKa,
          reading_en: finalReadingEn,
          prompt_version: PROMPT_VERSION,
          model_call1: call1Model,
          model_call2: call2.meta.modelCall2,
          tokens_call1: call1Tokens,
          tokens_call2_ka: call2.meta.tokensCall2Ka,
          tokens_call2_en: call2.meta.tokensCall2En,
          validation_warnings: call2.meta.validationWarnings,
          generation_status: 'complete',
          generation_finished_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select('id, share_slug')
        .single();

      if (saveError) throw saveError;

      // Bust the public-share cache so the newly generated reading is served
      // on the next visit. Owner-side natal route reads uncached.
      await invalidatePublicReadingByUser(authUser.id);

      return NextResponse.json({ status: 'complete', readingId: saved?.id, shareSlug: saved?.share_slug });
    } catch (call2Error: unknown) {
      console.error('[generate-full] Call 2 failed:', call2Error);
      throw call2Error;
    }
  } catch (error: unknown) {
    console.error('[generate-full] error:', error);
    // Tier-2: persist a durable 'failed' state + reason so /api/onboarding/status
    // can surface Retry immediately instead of the client polling for 15 minutes.
    // The reason rides in validation_warnings (no dedicated error column exists).
    if (userId) {
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await createAdminSupabase()
          .from('natal_readings')
          .update({
            generation_status: 'failed',
            generation_finished_at: new Date().toISOString(),
            validation_warnings: [`GENERATION_FAILED: ${reason.slice(0, 500)}`],
          })
          .eq('user_id', userId);
      } catch (markErr) {
        console.error('[generate-full] failed to record failure state:', markErr);
      }
    }
    return jsonServerError(error);
  }
}
