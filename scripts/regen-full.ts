// One-off operator regeneration of a premium user's FULL natal reading (Call 2).
// Mirrors app/api/reading/generate-full/route.ts exactly, but runs locally so
// Call 2 isn't bound by the serverless timeout that has been killing it.
// Requires: chart_data + analysis_en (Call 1) already present. Costs 2 AI calls.
//
//   npx tsx scripts/regen-full.ts [email]
//
// NOTE: the public-share cache (revalidateTag) can't be busted from a script —
// the owner reads uncached (sees it immediately); the public /r/<slug> page
// self-heals within its 24h floor, or bump visibility to force-invalidate.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { runNatalCall2 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import {
  buildPlanetTableForReading,
  mergeAspectsForReading,
  injectAndClean,
  generateShareSlug,
  type StoredPlanet,
  type StoredPoints,
  type StoredAspect,
} from '@/lib/chart/reading-helpers';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const EMAIL = process.argv[2] || 'n3014443@gmail.com';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: u } = await supabase
    .from('users')
    .select('id, email, account_type, natal_chart_unlocked')
    .eq('email', EMAIL)
    .maybeSingle();
  if (!u) { console.log('No user for', EMAIL); process.exit(1); }

  const isFull = u.account_type === 'premium' || u.natal_chart_unlocked === true;
  if (!isFull) { console.log(`User ${EMAIL} is not full-tier (account_type=${u.account_type}) — nothing to regenerate.`); process.exit(1); }

  const { data: chartRow } = await supabase
    .from('chart_data')
    .select('chart_context, planets, points, aspects')
    .eq('user_id', u.id)
    .maybeSingle();
  if (!chartRow?.chart_context) { console.log('Missing chart_context — user must complete onboarding first.'); process.exit(1); }

  const { data: r } = await supabase
    .from('natal_readings')
    .select('id, analysis_en, share_slug, reading_ka')
    .eq('user_id', u.id)
    .maybeSingle();
  if (!r?.analysis_en) { console.log('Missing analysis_en (Call 1) — run generate-call1 first.'); process.exit(1); }
  if (r.reading_ka) { console.log('reading_ka already present — nothing to regenerate. (Delete it first to force.)'); process.exit(0); }

  const context: string = chartRow.chart_context;
  const storedPlanets = chartRow.planets as StoredPlanet[] | null;
  const storedPoints = chartRow.points as StoredPoints | null;
  const storedAspects = chartRow.aspects as StoredAspect[] | null;

  console.log(`Regenerating FULL reading for ${EMAIL} (${u.id})`);
  console.log(`analysis_en chars: ${r.analysis_en.length}  | aspects: ${storedAspects?.length ?? 0}`);

  // Mark generating (mirrors the route so a polling client sees progress).
  await supabase.from('natal_readings')
    .update({ generation_status: 'generating', generation_started_at: new Date().toISOString(), generation_finished_at: null })
    .eq('user_id', u.id);

  const t0 = Date.now();
  try {
    console.log('Running Call 2 (KA cap 32k + EN cap 20k) in parallel…');
    const call2 = await runNatalCall2(
      r.analysis_en,
      context,
      (storedAspects as unknown as Array<{ planet1: string; planet2: string; aspect: string; orb: number }>) ?? undefined,
    );

    const planetTable = buildPlanetTableForReading(storedPlanets, storedPoints);
    const aspectsKa = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsKa);
    const aspectsEn = mergeAspectsForReading(storedAspects, call2.aspectInterpretationsEn);
    const finalReadingKa = injectAndClean(call2.readingKa as Record<string, unknown>, planetTable, aspectsKa);
    const finalReadingEn = injectAndClean(call2.readingEn as Record<string, unknown>, planetTable, aspectsEn);

    const shareSlug = r.share_slug ?? generateShareSlug();

    const { data: saved, error: saveError } = await supabase
      .from('natal_readings')
      .upsert({
        user_id: u.id,
        share_slug: shareSlug,
        analysis_en: r.analysis_en,
        reading_ka: finalReadingKa,
        reading_en: finalReadingEn,
        prompt_version: PROMPT_VERSION,
        model_call2: call2.meta.modelCall2,
        tokens_call2_ka: call2.meta.tokensCall2Ka,
        tokens_call2_en: call2.meta.tokensCall2En,
        validation_warnings: call2.meta.validationWarnings,
        generation_status: 'complete',
        generation_finished_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select('id, share_slug')
      .single();
    if (saveError) throw saveError;

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const cardCount = (rd: Record<string, unknown>) =>
      ['overview','mission','characteristics','relationships','work','shadow','spiritual','potential']
        .reduce((n, k) => { const s = rd[k] as { coreCards?: unknown[]; cards?: unknown[] } | undefined; const c = s?.coreCards ?? s?.cards; return n + (Array.isArray(c) ? c.length : 0); }, 0);

    console.log(`\n✅ DONE in ${secs}s`);
    console.log(`model_call2=${call2.meta.modelCall2}  tokens KA=${call2.meta.tokensCall2Ka} EN=${call2.meta.tokensCall2En}`);
    console.log(`KA cards=${cardCount(finalReadingKa)}  EN cards=${cardCount(finalReadingEn)}`);
    console.log(`validation_warnings: ${call2.meta.validationWarnings.length ? call2.meta.validationWarnings.join(' | ') : '(none)'}`);
    console.log(`share_slug=${saved?.share_slug}  → https://astrolo.ge/r/${saved?.share_slug}`);
    console.log('\nNote: public-share cache not busted from a script; owner sees it immediately, public page self-heals ≤24h.');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Call 2 FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${reason}`);
    await supabase.from('natal_readings')
      .update({
        generation_status: 'failed',
        generation_finished_at: new Date().toISOString(),
        validation_warnings: [`GENERATION_FAILED: ${reason.slice(0, 500)}`],
      })
      .eq('user_id', u.id);
    console.error('Row marked generation_status=failed.');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
