// ============================================================
// POST /api/chart/generate — Tier-split natal pipeline
// FREE:    Store birth data → Astrologer API → chart_data only
// INVITED: Store birth data → Astrologer API → chart_data → Call 1 → natal_readings(analysis_en) → trigger synastry
// PREMIUM: Handled by /api/reading/generate-full (post-payment)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getChartData } from '@/lib/astrology/api';
import { runNatalCall1 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { generateShareSlug } from '@/lib/chart/reading-helpers';
import { LUKA_CHART_CONTEXT, LUKA_CHART_DATA } from '@/lib/dev/test-charts';
import type { GenerateChartRequest } from '@/types/api';
import type { BirthData } from '@/types/chart';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { clearOnboardingToken } from '@/lib/auth/onboarding';

// This handler performs long-running network work (external astrology API + LLM calls),
// so it must run on the Node.js runtime on Vercel (Edge functions time out quickly).
export const runtime = 'nodejs';

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

// Canonical planet order — also the output order in the planets[] array
const MAIN_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'] as const;

// Astrologer v5 subject keys → display planet name
const PLANET_SUBJECT_KEYS: Array<[string, typeof MAIN_PLANETS[number]]> = [
  ['sun', 'Sun'], ['moon', 'Moon'], ['mercury', 'Mercury'], ['venus', 'Venus'], ['mars', 'Mars'],
  ['jupiter', 'Jupiter'], ['saturn', 'Saturn'], ['uranus', 'Uranus'], ['neptune', 'Neptune'], ['pluto', 'Pluto'],
];

// Astrologer v5 subject keys → output key for the points{} object
// NOTE: the output keys (`ascendant`, `midheaven`, `northNode`, etc.) are the
// contract consumed by lib/chart/reading-helpers.ts and lib/chart/static-reading.ts.
// Do NOT rename without updating those consumers.
const POINT_SUBJECT_KEYS: Array<[string, string]> = [
  ['ascendant', 'ascendant'],
  ['descendant', 'descendant'],
  ['medium_coeli', 'midheaven'],
  ['imum_coeli', 'ic'],
  ['true_north_lunar_node', 'northNode'],
  ['true_south_lunar_node', 'southNode'],
  ['mean_lilith', 'lilith'],
];

// Astrologer v5 subject keys for the 12 house cusps, in order 1..12
const HOUSE_SUBJECT_KEYS = [
  'first_house', 'second_house', 'third_house', 'fourth_house',
  'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
  'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house',
] as const;

const ROMAN_HOUSE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// API house-name string ("Eleventh_House") → 1-based index
const HOUSE_NAME_TO_INDEX: Record<string, number> = HOUSE_SUBJECT_KEYS.reduce(
  (acc, key, i) => {
    // "first_house" → "First_House"
    const apiName = key.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join('_');
    acc[apiName] = i;
    return acc;
  },
  {} as Record<string, number>
);

interface RawAspect {
  p1_name?: string; p2_name?: string; p1_abs_pos?: number; p2_abs_pos?: number;
  p1_speed?: number; p2_speed?: number;
  aspect?: string; orbit?: number; diff?: number;
  [key: string]: unknown;
}

interface SubjectPoint {
  abs_pos?: number;
  position?: number;
  sign?: string;
  house?: string | null;
  speed?: number;
  retrograde?: boolean;
  element?: string;
}

/**
 * Normalize Astrologer v5 birth-chart response into the stored chart_data shape.
 *
 * Downstream contract (DO NOT BREAK — see lib/chart/reading-helpers.ts):
 *   planets: [{ name, sign, degree: "Xo°YY'", house: "I".."XII", element, retrograde }]
 *   points:  { ascendant?, descendant?, midheaven?, ic?, northNode?, southNode?, lilith? }
 *             each value: { sign, degree }
 *   aspects: [{ planet1, planet2, aspect, orb }]  — top 15 tightest major aspects
 *   houses:  [{ number: 1..12, sign, degree }]
 *
 * Input shape (from lib/astrology/api.ts getChartData, the `chart_data` field):
 *   {
 *     chart_type, aspects: RawAspect[],
 *     subject: { sun, moon, ..., ascendant, first_house, ..., twelfth_house, ... },
 *     element_distribution, quality_distribution, active_points, active_aspects
 *   }
 *
 * Passes through LUKA_CHART_DATA-style clean format unchanged (dev seed path).
 */
function normalizeChartData(raw: unknown): {
  planets: unknown[] | null;
  aspects: unknown[] | null;
  points: Record<string, unknown> | null;
  houses: unknown[] | null;
} {
  if (!raw || typeof raw !== 'object') return { planets: null, aspects: null, points: null, houses: null };
  const data = raw as Record<string, unknown>;

  // Clean-format passthrough (dev fixtures like LUKA_CHART_DATA already match the stored shape)
  if (Array.isArray(data.planets) && data.planets[0] && 'name' in (data.planets[0] as Record<string, unknown>)) {
    return {
      planets: data.planets as unknown[],
      aspects: (data.aspects as unknown[]) ?? null,
      points: (data.points as Record<string, unknown>) ?? null,
      houses: (data.houses as unknown[]) ?? null,
    };
  }

  // Locate the subject. v5 birth-chart returns `subject`; some variants may use `first_subject`.
  const subject: Record<string, unknown> =
    (data.subject as Record<string, unknown>) ||
    (data.first_subject as Record<string, unknown>) ||
    data;

  const rawAspects = Array.isArray(data.aspects) ? (data.aspects as RawAspect[]) : [];

  // ── Planets: read each one directly from the subject ──
  // This is the fix for "missing Sun" — planets with no aspects are no longer dropped
  // because we never tried to reconstruct them from the aspect list in the first place.
  const planets: Array<{ name: string; sign: string; degree: string; house: string; element: string; retrograde: boolean }> = [];
  for (const [subjectKey, displayName] of PLANET_SUBJECT_KEYS) {
    const p = subject[subjectKey] as SubjectPoint | undefined;
    if (!p || typeof p.abs_pos !== 'number') continue;

    const { sign, degree, element } = absToSign(p.abs_pos);
    // API returns house as "Eleventh_House"; map to Roman numeral "XI".
    const houseIdx = typeof p.house === 'string' ? HOUSE_NAME_TO_INDEX[p.house] : undefined;
    const houseRoman = houseIdx != null ? ROMAN_HOUSE[houseIdx] : '';
    // Prefer explicit `retrograde` flag; fall back to negative speed.
    const retrograde = p.retrograde === true || (typeof p.speed === 'number' && p.speed < 0);

    planets.push({ name: displayName, sign, degree, house: houseRoman, element, retrograde });
  }

  // ── Houses: read each cusp from subject.first_house … subject.twelfth_house ──
  // This is the fix for "houses stored as null" — the API has never returned a top-level
  // data.houses array; the old code was reading an undefined field.
  const houseCusps: number[] = [];
  const normalizedHousesArr: Array<{ number: number; sign: string; degree: string }> = [];
  for (let i = 0; i < HOUSE_SUBJECT_KEYS.length; i++) {
    const h = subject[HOUSE_SUBJECT_KEYS[i]] as SubjectPoint | undefined;
    if (!h || typeof h.abs_pos !== 'number') continue;
    houseCusps.push(h.abs_pos);
    const { sign, degree } = absToSign(h.abs_pos);
    normalizedHousesArr.push({ number: i + 1, sign, degree });
  }

  // ── Points: ascendant, midheaven, nodes, lilith, etc. ──
  const points: Record<string, { sign: string; degree: string }> = {};
  for (const [subjectKey, outKey] of POINT_SUBJECT_KEYS) {
    const pt = subject[subjectKey] as SubjectPoint | undefined;
    if (!pt || typeof pt.abs_pos !== 'number') continue;
    const { sign, degree } = absToSign(pt.abs_pos);
    points[outKey] = { sign, degree };
  }

  // ── Aspects: unchanged filtering/shaping (this path has always worked) ──
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
    .slice(0, 15);

  return {
    planets: planets.length > 0 ? planets : null,
    aspects: normalizedAspects.length > 0 ? normalizedAspects : null,
    points: Object.keys(points).length > 0 ? points : null,
    houses: normalizedHousesArr.length === 12 ? normalizedHousesArr : null,
  };
}

interface StoredPlanet {
  name: string; sign: string; degree: string; house: string; element: string; retrograde: boolean;
}
interface StoredPoints {
  ascendant?: { sign: string; degree: string };
  [key: string]: unknown;
}
interface StoredAspect {
  planet1: string; planet2: string; aspect: string; orb: number;
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

    const isInvited = Boolean(body.invite_code);

    // 2. Get or create chart_data (idempotent)
    let context: string | null = null;
    let storedPlanets: StoredPlanet[] | null = null;
    let storedPoints: StoredPoints | null = null;
    let storedAspects: StoredAspect[] | null = null;

    const { data: existingChart } = await supabase
      .from('chart_data')
      .select('chart_context, api_response, planets, houses, aspects, points')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingChart?.chart_context) {
      context = existingChart.chart_context;
      storedPlanets = (typeof existingChart.planets === 'string' ? JSON.parse(existingChart.planets) : existingChart.planets) as StoredPlanet[] | null;
      storedPoints = (typeof existingChart.points === 'string' ? JSON.parse(existingChart.points) : existingChart.points) as StoredPoints | null;
      storedAspects = (typeof existingChart.aspects === 'string' ? JSON.parse(existingChart.aspects) : existingChart.aspects) as StoredAspect[] | null;
    } else {
      const birthData: BirthData = {
        name: body.name,
        year: body.birth_year,
        month: body.birth_month,
        day: body.birth_day,
        hour: body.birth_hour ?? 12,
        minute: body.birth_minute ?? 0,
        longitude: body.birth_lng,
        latitude: body.birth_lat,
        timezone: body.birth_timezone,
        city: body.birth_city,
      };

      let generated: { context: string; chartData: unknown };
      if (process.env.RAPIDAPI_KEY) {
        generated = await getChartData(birthData);
      } else {
        generated = { context: LUKA_CHART_CONTEXT, chartData: LUKA_CHART_DATA };
      }

      context = generated.context;
      const chartData = generated.chartData;

      const normalized = normalizeChartData(chartData);
      storedPlanets = normalized.planets as StoredPlanet[] | null;
      storedPoints = normalized.points as StoredPoints | null;
      storedAspects = normalized.aspects as StoredAspect[] | null;

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

    if (!context) throw new Error('Missing chart context');

    // ── FREE PATH: chart data only — no AI calls ──
    if (!isInvited) {
      // Create a minimal natal_readings row to get a share_slug for redirect
      const { data: existingSlug } = await supabase
        .from('natal_readings')
        .select('id, share_slug')
        .eq('user_id', user.id)
        .maybeSingle();

      let shareSlug = (existingSlug as { share_slug?: string } | null)?.share_slug ?? null;
      if (!shareSlug) {
        shareSlug = generateShareSlug();
        await supabase.from('natal_readings').upsert(
          { user_id: user.id, share_slug: shareSlug },
          { onConflict: 'user_id' }
        );
      }

      await clearOnboardingToken();
      return NextResponse.json({ status: 'complete', shareSlug, userId: user.id });
    }

    // ── INVITED PATH: Call 1 only (needed for synastry) ──
    // Check if Call 1 already done (idempotent retry)
    const { data: existingReading } = await supabase
      .from('natal_readings')
      .select('id, analysis_en')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingReading?.analysis_en) {
      const call1 = await runNatalCall1(context);

      await supabase.from('natal_readings').upsert({
        user_id: user.id,
        analysis_en: call1.analysis,
        prompt_version: PROMPT_VERSION,
        model_call1: call1.model,
        tokens_call1: call1.tokens,
      }, { onConflict: 'user_id' });
    }

    // 4. Handle invite accept + fire-and-forget synastry trigger
    await handleInviteAccept(supabase, user.id, body.invite_code!);

    await clearOnboardingToken();
    return NextResponse.json({ status: 'complete', userId: user.id });
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

  // Fire synastry generation in background (non-blocking)
  // Both users need analysis_en (Call 1) before synastry can run
  const { data: connection } = await supabase
    .from('synastry_connections')
    .select('id, inviter_id')
    .eq('invite_code', inviteCode)
    .single();

  if (connection) {
    const { data: inviterReading } = await supabase
      .from('natal_readings')
      .select('analysis_en')
      .eq('user_id', connection.inviter_id)
      .maybeSingle();

    if (inviterReading?.analysis_en) {
      // Both users have Call 1 — trigger synastry generation
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
      fetch(`${baseUrl}/api/synastry/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        body: JSON.stringify({ connection_id: connection.id }),
      }).catch((err) => console.error('[synastry trigger] fetch failed:', err));
    }
  }
}
