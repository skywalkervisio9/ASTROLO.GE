// ============================================================
// POST /api/reading/generate-full-ka
// Runs Call 2 for KA only and writes reading_ka. Paired with -en;
// /loading fires both fire-and-forget so each has its own 300s budget
// instead of sharing one (the old single-function design timed out at ~50%).
// Idempotent — returns cached if reading_ka already exists.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall2Single } from '@/lib/AIgeneration/pipeline';
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
export const maxDuration = 300;

export async function POST() {
  // readingId is captured outside the try so the catch can write generation_status='failed'
  // even when the failure happens deep inside Call 2.
  let readingId: string | null = null;
  const admin = createAdminSupabase();

  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { authUser } = auth;

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

    const { data: existing } = await admin
      .from('natal_readings')
      .select('id, analysis_en, reading_ka, share_slug')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.json({ error: 'natal_readings row missing — run /api/reading/generate-call1 first' }, { status: 400 });
    }

    readingId = existing.id;

    if (existing.reading_ka) {
      return NextResponse.json({ status: 'cached', readingId: existing.id, shareSlug: existing.share_slug });
    }

    if (!existing.analysis_en) {
      return NextResponse.json({ error: 'Call 1 analysis not found — run /api/reading/generate-call1 first' }, { status: 400 });
    }

    // Mark this row as actively generating before the long-running call.
    // The status route uses generation_started_at to promote stuck rows to
    // 'failed' once they've passed Vercel's 300s kill window. Resetting
    // generation_error here ensures a retry after a prior failure clears
    // the stale error from the row.
    await admin
      .from('natal_readings')
      .update({
        generation_status: 'generating',
        generation_started_at: new Date().toISOString(),
        generation_finished_at: null,
        generation_error: null,
      })
      .eq('id', existing.id);

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

    const call2 = await runNatalCall2Single('ka', existing.analysis_en, context, storedAspects ?? undefined);

    const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
    const aspectsKa = mergeAspectsForReading(storedAspects, call2.aspectInterpretations);
    const finalReadingKa = injectAndClean(call2.reading, planetTable, aspectsKa);

    // KA route owns share_slug: ensures one exists before redirect. EN route
    // reads it but never writes it, so there's no race.
    const shareSlug = existing.share_slug ?? generateShareSlug();

    const { data: saved, error: saveError } = await admin
      .from('natal_readings')
      .update({
        share_slug: shareSlug,
        reading_ka: finalReadingKa,
        prompt_version: PROMPT_VERSION,
        model_call2: call2.model,
        tokens_call2_ka: call2.tokensIn + call2.tokensOut,
        generation_status: 'complete',
        generation_finished_at: new Date().toISOString(),
        generation_error: null,
      })
      .eq('id', existing.id)
      .select('id, share_slug')
      .single();

    if (saveError) throw saveError;

    await invalidatePublicReadingByUser(authUser.id);

    return NextResponse.json({ status: 'complete', readingId: saved?.id, shareSlug: saved?.share_slug });
  } catch (error: unknown) {
    console.error('[generate-full-ka] error:', error);
    // Best-effort failure write so the polling loop surfaces a real error
    // instead of waiting 15 min for the silent timeout. Truncated to keep
    // the column small; full stack is in Vercel logs.
    if (readingId) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await admin
          .from('natal_readings')
          .update({
            generation_status: 'failed',
            generation_finished_at: new Date().toISOString(),
            generation_error: message.slice(0, 1000),
          })
          .eq('id', readingId);
      } catch (writeErr) {
        console.error('[generate-full-ka] failed to write failure status:', writeErr);
      }
    }
    return jsonServerError(error);
  }
}
