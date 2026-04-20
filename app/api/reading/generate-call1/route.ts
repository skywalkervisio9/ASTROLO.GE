// ============================================================
// POST /api/reading/generate-call1
// Runs Call 1 (chart analysis) and saves analysis_en to natal_readings.
// Idempotent — returns cached if analysis already exists.
// Must be called before /api/reading/generate-full for free users.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runNatalCall1 } from '@/lib/AIgeneration/pipeline';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { hasFullReading } from '@/types/user';
import type { User } from '@/types/user';

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

    // Idempotent: return cached if analysis already exists
    const { data: existing } = await admin
      .from('natal_readings')
      .select('id, analysis_en, model_call1, tokens_call1')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existing?.analysis_en) {
      return NextResponse.json({ status: 'cached' });
    }

    const { data: chartRow } = await admin
      .from('chart_data')
      .select('chart_context')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!chartRow?.chart_context) {
      return NextResponse.json({ error: 'Chart data not found — complete onboarding first' }, { status: 400 });
    }

    const call1 = await runNatalCall1(chartRow.chart_context);

    await admin
      .from('natal_readings')
      .upsert({
        user_id: authUser.id,
        analysis_en: call1.analysis,
        model_call1: call1.model,
        tokens_call1: call1.tokens,
      }, { onConflict: 'user_id' });

    return NextResponse.json({ status: 'done' });
  } catch (error: unknown) {
    console.error('[generate-call1] error:', error);
    return jsonServerError(error);
  }
}
