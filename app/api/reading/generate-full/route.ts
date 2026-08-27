// ============================================================
// POST /api/reading/generate-full
// Triggered post-payment (or dev mode premium button).
// Runs Call 1 (if not already done) + Call 2 KA+EN → full natal reading.
// User must have account_type = 'premium' or natal_chart_unlocked = true.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall1, runNatalCall2 } from '@/lib/AIgeneration/pipeline';
import { STALE_GENERATION_MS } from '@/lib/onboarding/status';
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
      .select('id, reading_ka, share_slug, generation_started_at')
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

    // Launch timestamp for this run. A fresh run keeps the Call 1 timestamp (well
    // within the window) so the /loading bar spans the whole run. But on a re-fire
    // over a hard-killed 'stale generating' row, reset it to now — otherwise the
    // preserved old timestamp reads as stale again immediately and the poller
    // would bail mid-run.
    const prevStartedMs = existingReading?.generation_started_at
      ? new Date(existingReading.generation_started_at).getTime()
      : 0;
    const startedAtIso =
      prevStartedMs && Date.now() - prevStartedMs <= STALE_GENERATION_MS
        ? (existingReading!.generation_started_at as string)
        : new Date().toISOString();

    // Mark the run underway BEFORE the (slow) inline Call 1 so
    // /api/onboarding/status reports 'generating' from the very first poll.
    // Previously generation_started_at was only stamped AFTER Call 1 finished,
    // leaving a Call-1-long window (often >45s on a fresh premium run where
    // analysis_en is missing) where status still returned 'not_started'. That
    // tripped /loading's not_started auto-recover grace and flashed
    // "your reading hasn't been generated yet" mid-generation. Matches the
    // stamp-before-AI-call order already used by /api/reading/generate-call1.
    await admin
      .from('natal_readings')
      .upsert({
        user_id: authUser.id,
        generation_status: 'generating',
        generation_started_at: startedAtIso,
        generation_finished_at: null,
      }, { onConflict: 'user_id' });

    // Call 1 (chart analysis) is the prerequisite for Call 2. Normally the
    // /loading flow runs it first, but this endpoint is self-contained: if the
    // analysis is missing it runs Call 1 here. That lets the client fire a
    // SINGLE (keepalive) request for the whole reading — no fragile client-side
    // gap between Call 1 and Call 2 where a closed tab could strand the run.
    const { data: analysisRow } = await admin
      .from('natal_readings')
      .select('analysis_en, model_call1, tokens_call1')
      .eq('user_id', authUser.id)
      .maybeSingle();

    let analysis = analysisRow?.analysis_en ?? '';
    let call1Model = analysisRow?.model_call1 ?? 'cached';
    let call1Tokens = analysisRow?.tokens_call1 ?? 0;

    if (!analysis) {
      const call1 = await runNatalCall1(context);
      analysis = call1.analysis;
      call1Model = call1.model;
      call1Tokens = call1.tokens;
      // Persist Call 1 output. The row was already stamped 'generating' with
      // generation_started_at above (before this call), so status reporting does
      // not depend on this write landing.
      await admin
        .from('natal_readings')
        .upsert({
          user_id: authUser.id,
          analysis_en: analysis,
          model_call1: call1Model,
          tokens_call1: call1Tokens,
        }, { onConflict: 'user_id' });
    }

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
