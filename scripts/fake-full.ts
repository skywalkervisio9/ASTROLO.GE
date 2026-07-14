// ============================================================
// Give seeded accounts a complete natal reading via the fake-full path
// (reuses cached Call 1 analysis, clones a real Call 2 reading, injects
// each user's own chart data). Mirrors app/api/dev/generate-fake-full.
//
//   npx tsx scripts/fake-full.ts <userId> [<userId> ...]
// Defaults to the two seeded synastry users.
// ============================================================

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { markReadingAsFakeCopy } from '@/lib/AIgeneration/fake-reading';
import {
  buildPlanetTableForReading,
  mergeAspectsForReading,
  injectAndClean,
  generateShareSlug,
  type StoredPlanet,
  type StoredPoints,
  type StoredAspect,
  type SingleLangInterp,
} from '@/lib/chart/reading-helpers';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const USER_IDS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['5346d125-a62c-4e77-9ba3-c1e32d2a8843', '0bb01ec1-0b50-4e53-8abd-9ee66eace5df'];

// Mirrors buildFakeAspectInterps in the route.
function buildFakeAspectInterps(
  fake: Record<string, unknown> | null,
  storedAspects: StoredAspect[] | null,
  lang: 'ka' | 'en',
): SingleLangInterp[] {
  if (!storedAspects || storedAspects.length === 0) return [];
  const overview = (fake?.overview ?? {}) as Record<string, unknown>;
  const src = Array.isArray(overview.aspects) ? (overview.aspects as Array<Record<string, unknown>>) : [];
  const prose = src
    .map((a) => ({
      interpretation: typeof a?.interpretation === 'string' ? a.interpretation.trim() : '',
      significance: a?.significance === 'high' ? ('high' as const) : ('normal' as const),
    }))
    .filter((p) => p.interpretation.length > 0);
  const placeholder = (asp: string) =>
    lang === 'ka'
      ? `🔁 FAKE — ${asp}: სატესტო ინტერპრეტაცია.`
      : `🔁 FAKE — ${asp}: placeholder interpretation.`;
  return storedAspects.map((a, i) => {
    const p = prose.length > 0 ? prose[i % prose.length] : null;
    return {
      planet1: a.planet1, planet2: a.planet2, aspect: a.aspect,
      interpretation: p ? p.interpretation : placeholder(a.aspect),
      significance: p ? p.significance : ('normal' as const),
    };
  });
}

async function fakeFull(userId: string) {
  const { data: chartRow } = await admin
    .from('chart_data').select('chart_context, planets, points, aspects')
    .eq('user_id', userId).maybeSingle();
  if (!chartRow?.chart_context) { console.log(`  ${userId}: no chart_data, skip`); return; }

  await admin.from('users').update({ account_type: 'premium', natal_chart_unlocked: true }).eq('id', userId);

  const { data: existing } = await admin
    .from('natal_readings').select('analysis_en, model_call1, tokens_call1, share_slug')
    .eq('user_id', userId).maybeSingle();

  const { data: sample } = await admin
    .from('natal_readings').select('reading_ka, reading_en')
    .neq('user_id', userId).not('reading_ka', 'is', null).not('reading_en', 'is', null)
    .limit(1).maybeSingle();
  if (!sample?.reading_ka || !sample?.reading_en) { console.log('  no clone source in DB'); return; }

  const fakeKa = markReadingAsFakeCopy(sample.reading_ka as Record<string, unknown>, 'ka');
  const fakeEn = markReadingAsFakeCopy(sample.reading_en as Record<string, unknown>, 'en');
  if (!fakeKa || !fakeEn) { console.log('  clone failed'); return; }

  const planets = chartRow.planets as StoredPlanet[] | null;
  const points = chartRow.points as StoredPoints | null;
  const aspects = chartRow.aspects as StoredAspect[] | null;
  const planetTable = buildPlanetTableForReading(planets, points);
  const aspectsKa = mergeAspectsForReading(aspects, buildFakeAspectInterps(fakeKa, aspects, 'ka'));
  const aspectsEn = mergeAspectsForReading(aspects, buildFakeAspectInterps(fakeEn, aspects, 'en'));
  const finalKa = injectAndClean(fakeKa, planetTable, aspectsKa);
  const finalEn = injectAndClean(fakeEn, planetTable, aspectsEn);
  const shareSlug = existing?.share_slug ?? generateShareSlug();

  const { error } = await admin.from('natal_readings').upsert({
    user_id: userId,
    share_slug: shareSlug,
    analysis_en: existing?.analysis_en ?? '',
    reading_ka: finalKa,
    reading_en: finalEn,
    prompt_version: `${PROMPT_VERSION}-fake`,
    model_call1: existing?.model_call1 ?? 'cached',
    model_call2: 'fake',
    tokens_call1: existing?.tokens_call1 ?? 0,
    tokens_call2_ka: 0,
    tokens_call2_en: 0,
    validation_warnings: ['DEV FAKE READING — cloned, Call 2 skipped'],
  }, { onConflict: 'user_id' });
  if (error) { console.log('  store failed:', error.message); return; }
  console.log(`  ${userId}: fake-full stored (slug ${shareSlug}) ✓`);
}

async function main() {
  console.log('Fake-full natal readings for:', USER_IDS.join(', '));
  for (const id of USER_IDS) await fakeFull(id);
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
