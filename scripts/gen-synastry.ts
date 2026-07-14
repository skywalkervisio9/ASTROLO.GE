// ============================================================
// Run a real synastry generation for an existing pair, directly via
// the pipeline (no dev server / preview timeout in the way). Stores the
// result and prints the scores.
//
//   npx tsx scripts/gen-synastry.ts <connectionId> [couple|friend]
// ============================================================

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { generateSynastryReading } from '@/lib/AIgeneration/pipeline';
import { extractSynastryScores } from '@/lib/synastry/share-helpers';
import { generateShareSlug } from '@/lib/chart/reading-helpers';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const connectionId = process.argv[2];
const relationshipType = (process.argv[3] as 'couple' | 'friend') || 'couple';
if (!connectionId) { console.error('usage: gen-synastry.ts <connectionId> [couple|friend]'); process.exit(1); }

async function main() {
  const { data: conn } = await admin
    .from('synastry_connections')
    .select('id, inviter_id, invitee_id')
    .eq('id', connectionId)
    .maybeSingle();
  if (!conn?.invitee_id) { console.error('connection or invitee missing'); process.exit(1); }

  const ids = [conn.inviter_id, conn.invitee_id];
  const [{ data: profiles }, { data: charts }, { data: readings }] = await Promise.all([
    admin.from('users').select('id, full_name, gender').in('id', ids),
    admin.from('chart_data').select('user_id, chart_context').in('user_id', ids),
    admin.from('natal_readings').select('user_id, analysis_en').in('user_id', ids),
  ]);

  const pA = profiles!.find((p) => p.id === conn.inviter_id)!;
  const pB = profiles!.find((p) => p.id === conn.invitee_id)!;
  const cA = charts!.find((c) => c.user_id === conn.inviter_id)!;
  const cB = charts!.find((c) => c.user_id === conn.invitee_id)!;
  const rA = readings!.find((r) => r.user_id === conn.inviter_id)!;
  const rB = readings!.find((r) => r.user_id === conn.invitee_id)!;

  console.log(`Generating ${relationshipType}: ${pA.full_name} + ${pB.full_name} …`);
  const t0 = Date.now();
  const result = await generateSynastryReading({
    personAName: pA.full_name,
    personAAnalysis: rA.analysis_en,
    personAChartContext: cA.chart_context,
    personBName: pB.full_name,
    personBAnalysis: rB.analysis_en,
    personBChartContext: cB.chart_context,
    relationshipType,
  });
  console.log(`Generated in ${((Date.now() - t0) / 1000).toFixed(0)}s | tokens KA=${result.meta.tokensCall2Ka} EN=${result.meta.tokensCall2En} | warnings=${JSON.stringify(result.meta.validationWarnings)}`);

  // Inject each person's gender into meta so the UI (aspect wheel colours) has it.
  const injectGender = (reading: unknown) => {
    const m = (reading as { meta?: { personA?: Record<string, unknown>; personB?: Record<string, unknown> } })?.meta;
    if (m?.personA) m.personA.gender = pA.gender ?? null;
    if (m?.personB) m.personB.gender = pB.gender ?? null;
  };
  injectGender(result.readingEn);
  injectGender(result.readingKa);

  const scores = extractSynastryScores(result.readingEn as unknown as Record<string, unknown>);
  const enMeta = (result.readingEn as { meta?: Record<string, unknown> }).meta ?? {};
  console.log('categoryScores:', JSON.stringify(enMeta.categoryScores));
  console.log('derived overall (stored):', scores.compatibility_score);

  await admin.from('synastry_readings').delete().eq('connection_id', connectionId);
  const { error } = await admin.from('synastry_readings').insert({
    connection_id: connectionId,
    user1_id: conn.inviter_id,
    user2_id: conn.invitee_id,
    relationship_type: relationshipType,
    analysis_en: result.analysis,
    reading_ka: result.readingKa,
    reading_en: result.readingEn,
    compatibility_score: scores.compatibility_score,
    category_scores: scores.category_scores,
    share_slug: generateShareSlug(),
    prompt_version: relationshipType === 'couple' ? 'SYSTEM-PROMPT-Couple_s7' : 'SYSTEM-PROMPT-Friend_s7',
    model_call2: result.meta.modelCall2,
    tokens_call2_ka: result.meta.tokensCall2Ka,
    tokens_call2_en: result.meta.tokensCall2En,
    validation_warnings: result.meta.validationWarnings,
  });
  if (error) { console.error('store failed:', error.message); process.exit(1); }
  await admin.from('synastry_connections').update({ status: 'reading_generated' }).eq('id', connectionId);
  console.log('STORED ✓  connection:', connectionId);
}

main().catch((e) => { console.error('GENERATION FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
