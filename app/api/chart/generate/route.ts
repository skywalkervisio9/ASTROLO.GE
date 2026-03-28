// ============================================================
// POST /api/chart/generate — Full natal reading pipeline
// 1. Store birth data in users table
// 2. Call Astrologer API → store in chart_data
// 3. Run Claude pipeline (Call 1 + Call 2 x2) → store in natal_readings
// 4. Handle invite code if present → trigger synastry
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getChartData } from '@/lib/astrology/api';
import { generateNatalReading } from '@/lib/claude/pipeline';
import { LUKA_CHART_CONTEXT, LUKA_CHART_DATA } from '@/lib/dev/test-charts';
import type { GenerateChartRequest } from '@/types/api';
import type { BirthData } from '@/types/chart';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { clearOnboardingToken } from '@/lib/auth/onboarding';

export const maxDuration = 300; // Claude + external APIs can take 1-2 minutes

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = auth.supabase;
    const user = auth.authUser;

    const body: GenerateChartRequest = await req.json();
    console.log('[chart/generate] request received', {
      userId: user.id,
      hasName: Boolean(body.name),
      birth_day: body.birth_day,
      birth_month: body.birth_month,
      birth_year: body.birth_year,
      hasBirthCity: Boolean(body.birth_city),
      birth_lat: body.birth_lat,
      birth_lng: body.birth_lng,
      hasBirthTimezone: Boolean(body.birth_timezone),
      hasGender: Boolean(body.gender),
    });

    // Guard: do NOT overwrite user profile with nulls.
    // If birth data isn't fully provided, treat as a bad request.
    const missingFields: string[] = [];
    if (!body.name) missingFields.push('name');
    if (!body.birth_day) missingFields.push('birth_day');
    if (!body.birth_month) missingFields.push('birth_month');
    if (!body.birth_year) missingFields.push('birth_year');
    if (!body.birth_city) missingFields.push('birth_city');
    if (typeof body.birth_lat !== 'number') missingFields.push('birth_lat');
    if (typeof body.birth_lng !== 'number') missingFields.push('birth_lng');
    if (!body.birth_timezone) missingFields.push('birth_timezone');
    if (!body.gender) missingFields.push('gender');

    if (missingFields.length > 0) {
      console.error('[chart/generate] missing birth fields', {
        userId: user.id,
        missingFields,
      });
      return jsonBadRequest('Missing birth data fields', { missingFields });
    }

    // Ensure users row exists before update. This avoids "no-op update"
    // when auth trigger is missing/delayed.
    const fallbackName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split('@')[0]
      || 'User';

    const profilePatch = {
      full_name: String(body.name || fallbackName),
      birth_day: body.birth_day,
      birth_month: body.birth_month,
      birth_year: body.birth_year,
      birth_hour: body.birth_hour,
      birth_minute: body.birth_minute,
      birth_city: body.birth_city,
      birth_lat: body.birth_lat,
      birth_lng: body.birth_lng,
      birth_timezone: body.birth_timezone,
      gender: body.gender,
      free_section_pick: body.free_section_pick || null,
    };

    // 1. Upsert + update profile with birth data
    // Use service role if present to bypass RLS and guarantee persistence.
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminSupabase();
      // Single upsert so we don't depend on row existence or multiple statements.
      const { data: updatedProfile, error: upsertError } = await admin
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email ?? 'unknown',
            ...profilePatch,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single();
      if (upsertError) throw upsertError;

      // Debug-friendly: if we got here, the profile is persisted.
      // We don't return it to the client UI directly, but it helps confirm in logs/inspection.
      void updatedProfile;
    } else {
      const { error: updateError } = await supabase
        .from('users')
        .update(profilePatch)
        .eq('id', user.id);
      if (updateError) throw updateError;
    }

    // Check if reading already exists
    const { data: existing } = await supabase
      .from('natal_readings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await clearOnboardingToken();
      return NextResponse.json({ readingId: existing.id, status: 'complete' });
    }

    // 2. Get or create chart_data (idempotent)
    let context: string | null = null;
    let chartData: unknown | null = null;

    const { data: existingChart } = await supabase
      .from('chart_data')
      .select('chart_context, api_response, planets, houses, aspects, points')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingChart?.chart_context) {
      context = existingChart.chart_context;
      chartData = existingChart.api_response;
    } else {
      const birthData: BirthData = {
        name: body.name,
        year: body.birth_year,
        month: body.birth_month,
        day: body.birth_day,
        hour: body.birth_hour ?? 12,  // noon if unknown
        minute: body.birth_minute ?? 0,
        longitude: body.birth_lng,
        latitude: body.birth_lat,
        timezone: body.birth_timezone,
        city: body.birth_city,
      };

      const generated = process.env.RAPIDAPI_KEY
        ? await getChartData(birthData)
        : { context: LUKA_CHART_CONTEXT, chartData: LUKA_CHART_DATA };

      context = generated.context;
      chartData = generated.chartData;

      // Store chart data (unique on user_id)
      await supabase.from('chart_data').insert({
        user_id: user.id,
        api_response: chartData,
        chart_context: context,
        planets: (chartData as Record<string, unknown>)?.planets ?? null,
        houses: (chartData as Record<string, unknown>)?.houses ?? null,
        aspects: (chartData as Record<string, unknown>)?.aspects ?? null,
        points: (chartData as Record<string, unknown>)?.points ?? null,
      });
    }

    if (!context) {
      throw new Error('Missing chart context');
    }

    // 3. Run Claude pipeline (KA + EN in parallel)
    const result = await generateNatalReading(context);

    // Store reading
    const { data: reading, error: readingError } = await supabase
      .from('natal_readings')
      .insert({
        user_id: user.id,
        analysis_en: result.analysis,
        reading_ka: result.readingKa,
        reading_en: result.readingEn,
        prompt_version: 'SYSTEM-PROMPT-8SEC_i4',
        model_call1: result.meta.modelCall1,
        model_call2: result.meta.modelCall2,
        tokens_call1: result.meta.tokensCall1,
        tokens_call2_ka: result.meta.tokensCall2Ka,
        tokens_call2_en: result.meta.tokensCall2En,
        validation_warnings: result.meta.validationWarnings,
      })
      .select('id')
      .single();

    if (readingError) throw readingError;

    // 4. Handle invite code — trigger synastry if needed
    if (body.invite_code) {
      await handleInviteAccept(supabase, user.id, body.invite_code);
    }

    await clearOnboardingToken();

    return NextResponse.json({
      readingId: reading?.id,
      status: 'complete',
      userId: user.id,
    });
  } catch (error: unknown) {
    console.error('Chart generation error:', error);
    return jsonServerError(error);
  }
}

/**
 * Handle invite code acceptance and trigger synastry generation
 */
async function handleInviteAccept(
  supabase: Awaited<ReturnType<typeof requireAuthContext>>['supabase'],
  userId: string,
  inviteCode: string
) {
  // Validate and use the invite code
  const { data: code } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode)
    .eq('status', 'active')
    .single();

  if (!code) return;

  // Mark code as used
  await supabase
    .from('invite_codes')
    .update({ status: 'used', used_by: userId, used_at: new Date().toISOString() })
    .eq('id', code.id);

  // Update the connection
  await supabase
    .from('synastry_connections')
    .update({ invitee_id: userId, status: 'accepted' })
    .eq('invite_code', inviteCode);

  // Set user as invited
  await supabase
    .from('users')
    .update({ account_type: 'invited' })
    .eq('id', userId);

  // TODO: Trigger synastry generation in background
  // This should be handled by a background job / edge function
  // to avoid blocking the response (synastry adds ~40-60s)
}
