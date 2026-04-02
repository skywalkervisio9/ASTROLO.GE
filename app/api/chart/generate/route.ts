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
import { generateNatalReading } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { LUKA_CHART_CONTEXT, LUKA_CHART_DATA } from '@/lib/dev/test-charts';
import type { GenerateChartRequest } from '@/types/api';
import type { BirthData } from '@/types/chart';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { clearOnboardingToken } from '@/lib/auth/onboarding';
import crypto from 'crypto';

function generateShareSlug(): string {
  // 8-char URL-safe slug (base36 = lowercase alphanumeric)
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

// ── Normalize Astrologer API response to the format hydrateReading() expects ──
// The real API returns raw astronomical data (p1_name, p2_name, orbit, abs_pos).
// We transform it to match the clean LUKA_CHART_DATA schema the frontend uses.

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

function absToSign(absPos: number): { sign: string; degree: string; element: string } {
  const signIdx = Math.floor(absPos / 30) % 12;
  const deg = absPos % 30;
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  const sign = ZODIAC_SIGNS[signIdx];
  return { sign, degree: `${d}°${String(m).padStart(2, '0')}'`, element: SIGN_ELEMENTS[sign] || '' };
}

function cleanPlanetName(raw: string): string {
  // "True_North_Lunar_Node" → "North Node", "Mean_Lilith" → "Lilith", etc.
  const map: Record<string, string> = {
    True_North_Lunar_Node: 'North Node', True_South_Lunar_Node: 'South Node',
    Mean_Lilith: 'Lilith', Medium_Coeli: 'Midheaven', Imum_Coeli: 'IC',
  };
  return map[raw] || raw.replace(/_/g, ' ');
}

const MAIN_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const POINT_KEYS: Record<string, string> = {
  Ascendant: 'ascendant', Descendant: 'descendant',
  Medium_Coeli: 'midheaven', Imum_Coeli: 'ic',
  True_North_Lunar_Node: 'northNode', True_South_Lunar_Node: 'southNode',
  Mean_Lilith: 'lilith',
};

interface RawAspect {
  p1_name?: string; p2_name?: string; p1_abs_pos?: number; p2_abs_pos?: number;
  p1_speed?: number; p2_speed?: number;
  aspect?: string; orbit?: number; diff?: number;
  [key: string]: unknown;
}

function normalizeChartData(raw: unknown): {
  planets: unknown[] | null;
  aspects: unknown[] | null;
  points: Record<string, unknown> | null;
  houses: unknown[] | null;
} {
  if (!raw || typeof raw !== 'object') return { planets: null, aspects: null, points: null, houses: null };
  const data = raw as Record<string, unknown>;

  // If already in clean format (e.g., LUKA_CHART_DATA), pass through
  if (Array.isArray(data.planets) && data.planets[0] && 'name' in (data.planets[0] as Record<string, unknown>)) {
    return {
      planets: data.planets as unknown[],
      aspects: data.aspects as unknown[] ?? null,
      points: data.points as Record<string, unknown> ?? null,
      houses: data.houses as unknown[] ?? null,
    };
  }

  // Transform Astrologer API format
  const rawAspects = Array.isArray(data.aspects) ? data.aspects as RawAspect[] : [];

  // Build planets from unique planet positions in aspects data
  const planetPositions = new Map<string, { absPos: number; speed: number }>();
  for (const asp of rawAspects) {
    if (asp.p1_name && asp.p1_abs_pos != null && MAIN_PLANETS.includes(asp.p1_name)) {
      if (!planetPositions.has(asp.p1_name)) {
        planetPositions.set(asp.p1_name, { absPos: asp.p1_abs_pos, speed: asp.p1_speed ?? 0 });
      }
    }
    if (asp.p2_name && asp.p2_abs_pos != null && MAIN_PLANETS.includes(asp.p2_name)) {
      if (!planetPositions.has(asp.p2_name)) {
        planetPositions.set(asp.p2_name, { absPos: asp.p2_abs_pos, speed: asp.p2_speed ?? 0 });
      }
    }
  }

  // Build house cusps array for planet house assignment
  // Houses data from API might be array of objects with abs_pos or degree
  const houseCusps: number[] = [];
  if (Array.isArray(data.houses)) {
    for (const h of data.houses as Record<string, unknown>[]) {
      const pos = (h.abs_pos ?? h.degree ?? h.position) as number | undefined;
      if (typeof pos === 'number') houseCusps.push(pos);
    }
  }

  function getHouse(absPos: number): string {
    if (houseCusps.length < 12) return '';
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    for (let i = 0; i < 12; i++) {
      const next = (i + 1) % 12;
      let start = houseCusps[i];
      let end = houseCusps[next];
      if (end < start) end += 360; // wrap around
      let pos = absPos;
      if (pos < start) pos += 360;
      if (pos >= start && pos < end) return ROMAN[i];
    }
    return '';
  }

  const planets = MAIN_PLANETS
    .filter(name => planetPositions.has(name))
    .map(name => {
      const pos = planetPositions.get(name)!;
      const { sign, degree, element } = absToSign(pos.absPos);
      return { name, sign, degree, house: getHouse(pos.absPos), element, retrograde: pos.speed < 0 };
    });

  // Build points from non-planet positions
  const points: Record<string, { sign: string; degree: string }> = {};
  for (const asp of rawAspects) {
    for (const [pName, pAbsPos] of [[asp.p1_name, asp.p1_abs_pos], [asp.p2_name, asp.p2_abs_pos]] as [string, number][]) {
      if (pName && pAbsPos != null && POINT_KEYS[pName] && !points[POINT_KEYS[pName]]) {
        const { sign, degree } = absToSign(pAbsPos);
        points[POINT_KEYS[pName]] = { sign, degree };
      }
    }
  }

  // Normalize aspects: only keep major planet-to-planet aspects with tight orbs
  const majorAspectTypes = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
  const normalizedAspects = rawAspects
    .filter(a => a.p1_name && a.p2_name && a.aspect && majorAspectTypes.includes(a.aspect) && (a.orbit ?? 99) < 8)
    .map(a => ({
      planet1: cleanPlanetName(a.p1_name!),
      planet2: cleanPlanetName(a.p2_name!),
      aspect: a.aspect,
      orb: Math.round((a.orbit ?? a.diff ?? 0) * 100) / 100,
    }))
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 15); // Top 15 tightest

  // Normalize houses to { number, sign, degree } format
  let normalizedHouses: unknown[] | null = null;
  if (houseCusps.length >= 12) {
    normalizedHouses = houseCusps.map((absPos, i) => {
      const { sign, degree } = absToSign(absPos);
      return { number: i + 1, sign, degree };
    });
  } else if (Array.isArray(data.houses)) {
    normalizedHouses = data.houses as unknown[];
  }

  return {
    planets: planets.length > 0 ? planets : null,
    aspects: normalizedAspects.length > 0 ? normalizedAspects : null,
    points: Object.keys(points).length > 0 ? points : null,
    houses: normalizedHouses,
  };
}

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
      .select('id, share_slug')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await clearOnboardingToken();
      return NextResponse.json({ readingId: existing.id, shareSlug: existing.share_slug, status: 'complete' });
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

      // Normalize raw Astrologer API data to the format the frontend expects
      const normalized = normalizeChartData(chartData);

      // Store chart data (unique on user_id)
      await supabase.from('chart_data').insert({
        user_id: user.id,
        api_response: chartData,
        chart_context: context,
        planets: normalized.planets,
        houses: normalized.houses,
        aspects: normalized.aspects,
        points: normalized.points,
      });
    }

    if (!context) {
      throw new Error('Missing chart context');
    }

    // 3. Run Claude pipeline (KA + EN in parallel)
    const result = await generateNatalReading(context);

    // Store reading with public share slug
    const shareSlug = generateShareSlug();
    const { data: reading, error: readingError } = await supabase
      .from('natal_readings')
      .insert({
        user_id: user.id,
        share_slug: shareSlug,
        analysis_en: result.analysis,
        reading_ka: result.readingKa,
        reading_en: result.readingEn,
        prompt_version: PROMPT_VERSION,
        model_call1: result.meta.modelCall1,
        model_call2: result.meta.modelCall2,
        tokens_call1: result.meta.tokensCall1,
        tokens_call2_ka: result.meta.tokensCall2Ka,
        tokens_call2_en: result.meta.tokensCall2En,
        validation_warnings: result.meta.validationWarnings,
      })
      .select('id, share_slug')
      .single();

    if (readingError) throw readingError;

    // 4. Handle invite code — trigger synastry if needed
    if (body.invite_code) {
      await handleInviteAccept(supabase, user.id, body.invite_code);
    }

    await clearOnboardingToken();

    return NextResponse.json({
      readingId: reading?.id,
      shareSlug: reading?.share_slug ?? shareSlug,
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
