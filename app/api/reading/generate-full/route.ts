// ============================================================
// POST /api/reading/generate-full
// Triggered post-payment (or dev mode premium button).
// Runs Call 1 (if not already done) + Call 2 KA+EN → full natal reading.
// User must have account_type = 'premium' or natal_chart_unlocked = true.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall1, runNatalCall2 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { hasFullReading } from '@/types/user';
import type { User } from '@/types/user';
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
export const maxDuration = 800;

export async function POST() {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { supabase, authUser } = auth;
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

    // Call 1: run if missing (free users don't have it, invited users do)
    let analysis: string;
    let call1Model = 'cached';
    let call1Tokens = 0;

    if (existingReading?.reading_ka === null && existingReading?.id) {
      // natal_readings row exists with analysis_en (invited user) — reuse it
      const { data: analysisRow } = await admin
        .from('natal_readings')
        .select('analysis_en, model_call1, tokens_call1')
        .eq('user_id', authUser.id)
        .single();

      analysis = analysisRow?.analysis_en ?? '';
      call1Model = analysisRow?.model_call1 ?? 'cached';
      call1Tokens = analysisRow?.tokens_call1 ?? 0;
    } else {
      // Free user — no natal_readings row yet, run Call 1
      const call1 = await runNatalCall1(context);
      analysis = call1.analysis;
      call1Model = call1.model;
      call1Tokens = call1.tokens;
    }

    if (!analysis) {
      // Fallback: re-run Call 1
      const call1 = await runNatalCall1(context);
      analysis = call1.analysis;
      call1Model = call1.model;
      call1Tokens = call1.tokens;
    }

    // Call 2: KA + EN in parallel
    const call2 = await runNatalCall2(analysis, context, storedAspects ?? undefined);

    // Inject chart_data into readings
    const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
    const aspectsKa = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsKa);
    const aspectsEn = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsEn);

    const finalReadingKa = injectAndClean(call2.readingKa, planetTable, aspectsKa);
    const finalReadingEn = injectAndClean(call2.readingEn, planetTable, aspectsEn);

    const shareSlug = generateShareSlug();

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
      }, { onConflict: 'user_id' })
      .select('id, share_slug')
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ status: 'complete', readingId: saved?.id, shareSlug: saved?.share_slug });
  } catch (error: unknown) {
    console.error('[generate-full] error:', error);
    return jsonServerError(error);
  }
}
