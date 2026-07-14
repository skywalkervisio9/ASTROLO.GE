// ============================================================
// Backfill chart_data.planets / points / aspects / houses for users
// whose row only has chart_context + api_response (e.g. seeded users).
// Re-normalizes the stored raw Astrologer api_response.
//
//   npx tsx scripts/fix-chart-planets.ts <userId> [<userId> ...]
// Defaults to the two seeded synastry users.
// ============================================================

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { normalizeChartData } from '@/app/api/chart/generate/route';

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

async function fix(userId: string) {
  const { data: row } = await admin
    .from('chart_data').select('api_response, planets').eq('user_id', userId).maybeSingle();
  if (!row?.api_response) { console.log(`  ${userId}: no api_response, skip`); return; }

  const n = normalizeChartData(row.api_response);
  if (!n.planets) { console.log(`  ${userId}: normalize produced no planets`); return; }

  const { error } = await admin.from('chart_data').update({
    planets: n.planets, points: n.points, aspects: n.aspects, houses: n.houses,
  }).eq('user_id', userId);
  if (error) { console.log(`  ${userId}: update failed: ${error.message}`); return; }
  console.log(`  ${userId}: planets=${n.planets.length} points=${n.points ? Object.keys(n.points).length : 0} aspects=${n.aspects?.length ?? 0} ✓`);
}

async function main() {
  console.log('Backfilling chart_data for:', USER_IDS.join(', '));
  for (const id of USER_IDS) await fix(id);
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
