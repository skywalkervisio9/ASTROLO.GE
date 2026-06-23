// ============================================================
// POST /api/user/birth-data — DOB correction + re-generation reset
//
// Updates the caller's birth data and resets cached generation so /loading
// re-runs the pipeline from the corrected data.
//   Free / invited-not-unlocked: unlimited — astrologer API chart only.
//   Premium / invited+:          one correction, blocked once synastry started.
// Returns { mode } so the client knows which /loading flow to enter.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { issueOnboardingToken } from '@/lib/auth/onboarding';
import { invalidateNatalChart } from '@/lib/data/natal-reading';
import { invalidatePublicReadingByUser } from '@/lib/data/public-reading';
import { hasFullReading, dobCorrectionState } from '@/types/user';
import type { User } from '@/types/user';
import type { GenerateChartRequest } from '@/types/api';

export const runtime = 'nodejs';

function validateBirthPayload(body: GenerateChartRequest): string[] {
  const missing: string[] = [];
  if (!body.name) missing.push('name');
  if (!body.birth_day) missing.push('birth_day');
  if (!body.birth_month) missing.push('birth_month');
  if (!body.birth_year) missing.push('birth_year');
  if (!body.birth_city) missing.push('birth_city');
  if (typeof body.birth_lat !== 'number') missing.push('birth_lat');
  if (typeof body.birth_lng !== 'number') missing.push('birth_lng');
  if (!body.birth_timezone) missing.push('birth_timezone');
  if (!body.gender) missing.push('gender');
  return missing;
}

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response || !auth.authUser) {
      return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.authUser.id;
    const admin = createAdminSupabase();

    const body = (await req.json()) as GenerateChartRequest;
    const missing = validateBirthPayload(body);
    if (missing.length > 0) {
      return jsonBadRequest('Missing birth data fields', { missingFields: missing });
    }

    // Load profile (tier + counter) and synastry connections (lock condition).
    const { data: profile, error: profileErr } = await admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileErr || !profile) throw profileErr ?? new Error('Profile not found');
    const user = profile as User;

    const { data: connections } = await admin
      .from('synastry_connections')
      .select('status, inviter_id, invitee_id')
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`);
    const synastryStarted = (connections ?? []).some(
      (c) => c.status === 'accepted' || c.status === 'reading_generated',
    );

    const isFull = hasFullReading(user);
    // Invited tiers (not yet full) have a Call-1 partial reading (analysis_en)
    // that must also be regenerated so the text reflects the corrected DOB.
    const isCall1Tier = !isFull && (user.account_type === 'invited' || user.account_type === 'invited+');
    const state = dobCorrectionState(user, synastryStarted);
    if (!state.allowed) {
      return NextResponse.json(
        { error: 'DOB correction locked', reason: state.reason },
        { status: 403 },
      );
    }

    // 1. Persist corrected birth data (name unchanged).
    const birthPatch: Record<string, unknown> = {
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
    };
    // Count the correction for full-reading users only (free is unlimited).
    if (isFull) birthPatch.dob_corrections_used = user.dob_corrections_used + 1;

    const { error: updateErr } = await admin.from('users').update(birthPatch).eq('id', userId);
    if (updateErr) throw updateErr;

    // 2. Reset cached generation so the pipeline recomputes from new birth data.
    //    Deleting chart_data forces chart/generate to re-hit the astrologer API
    //    and makes /api/onboarding/status report 'queued' (skips the early-exit).
    await admin.from('chart_data').delete().eq('user_id', userId);
    invalidateNatalChart(userId);

    if (isFull || isCall1Tier) {
      // Keep the natal_readings row (preserve id, share_slug, is_public) but
      // clear the AI output + status so generate-call1 / generate-full re-run.
      // Invited tiers only have analysis_en, but nulling the full set is safe.
      await admin
        .from('natal_readings')
        .update({
          analysis_en: null,
          reading_ka: null,
          reading_en: null,
          model_call1: null,
          model_call2: null,
          tokens_call1: null,
          tokens_call2_ka: null,
          tokens_call2_en: null,
          generation_status: null,
          generation_error: null,
          validation_warnings: null,
        })
        .eq('user_id', userId);
      await invalidatePublicReadingByUser(userId);
    }

    // 3. Queue the corrected payload so /loading regenerates from it.
    const payload: GenerateChartRequest = {
      name: user.full_name ?? body.name,
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
    };
    await issueOnboardingToken(userId, payload);

    const mode = isFull ? 'regenerate-full' : isCall1Tier ? 'regenerate-call1' : 'free';
    return NextResponse.json({ status: 'ok', mode });
  } catch (error) {
    return jsonServerError(error);
  }
}
