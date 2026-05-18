// ============================================================
// POST /api/reading/generate-full-en
// Runs Call 2 for EN only and writes reading_en. Paired with -ka;
// /loading fires both fire-and-forget so each has its own 300s budget.
// Does not touch share_slug (KA route owns it) to avoid races.
// Idempotent — returns cached if reading_en already exists.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall2Single } from '@/lib/AIgeneration/pipeline';
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
  type StoredPlanet,
  type StoredPoints,
  type StoredAspect,
} from '@/lib/chart/reading-helpers';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { authUser } = auth;
    const admin = createAdminSupabase();

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
      .select('id, analysis_en, reading_en')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.json({ error: 'natal_readings row missing — run /api/reading/generate-call1 first' }, { status: 400 });
    }

    if (existing.reading_en) {
      return NextResponse.json({ status: 'cached', readingId: existing.id });
    }

    if (!existing.analysis_en) {
      return NextResponse.json({ error: 'Call 1 analysis not found — run /api/reading/generate-call1 first' }, { status: 400 });
    }

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

    const call2 = await runNatalCall2Single('en', existing.analysis_en, context, storedAspects ?? undefined);

    const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
    const aspectsEn = mergeAspectsForReading(storedAspects, call2.aspectInterpretations);
    const finalReadingEn = injectAndClean(call2.reading, planetTable, aspectsEn);

    const { error: saveError } = await admin
      .from('natal_readings')
      .update({
        reading_en: finalReadingEn,
        tokens_call2_en: call2.tokensIn + call2.tokensOut,
      })
      .eq('id', existing.id);

    if (saveError) throw saveError;

    await invalidatePublicReadingByUser(authUser.id);

    return NextResponse.json({ status: 'complete', readingId: existing.id });
  } catch (error: unknown) {
    console.error('[generate-full-en] error:', error);
    return jsonServerError(error);
  }
}
