// ============================================================
// POST /api/chart/generate — Full natal reading pipeline
// 1. Store birth data in users table
// 2. Call Astrologer API → store in chart_data
// 3. Run Claude pipeline (Call 1 + Call 2 x2) → store in natal_readings
// 4. Handle invite code if present → trigger synastry
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getChartData } from '@/lib/astrology/api';
import { generateNatalReading } from '@/lib/claude/pipeline';
import type { GenerateChartRequest } from '@/types/api';
import type { BirthData } from '@/types/chart';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateChartRequest = await req.json();

    // 1. Update user profile with birth data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: body.name,
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
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Check if reading already exists
    const { data: existing } = await supabase
      .from('natal_readings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ readingId: existing.id, status: 'complete' });
    }

    // 2. Call Astrologer API
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
    };

    const { context, chartData } = await getChartData(birthData);

    // Store chart data
    await supabase.from('chart_data').insert({
      user_id: user.id,
      api_response: chartData,
      chart_context: context,
      planets: (chartData as Record<string, unknown>)?.subjects ?? null,
      houses: (chartData as Record<string, unknown>)?.houses ?? null,
      aspects: (chartData as Record<string, unknown>)?.aspects ?? null,
      points: (chartData as Record<string, unknown>)?.points ?? null,
    });

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
      await handleInviteAccept(supabase, user.id, body.invite_code, context);
    }

    return NextResponse.json({
      readingId: reading?.id,
      status: 'complete',
    });
  } catch (error: unknown) {
    console.error('Chart generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, status: 'error' }, { status: 500 });
  }
}

/**
 * Handle invite code acceptance and trigger synastry generation
 */
async function handleInviteAccept(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  inviteCode: string,
  chartContext: string
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
