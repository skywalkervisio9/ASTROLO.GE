// ============================================================
// Seed two fresh test users with real chart data + real Call 1,
// so a real synastry generation can be run against them.
//
//   npx tsx scripts/seed-synastry-pair.ts
//
// Prints the two user ids to pass to /api/dev/test-synastry.
// Uses the Astrologer API (chart) + Gemini Call 1 (analysis). No Call 2.
// ============================================================

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getChartData } from '@/lib/astrology/api';
import { runNatalCall1 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { generateShareSlug } from '@/lib/chart/reading-helpers';
import type { BirthData } from '@/types/chart';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface Seed {
  full_name: string;
  gender: 'female' | 'male';
  birth: BirthData;
}

// Two distinct births in Tbilisi. Female + male → couple synastry.
const SEEDS: Seed[] = [
  {
    full_name: 'ნინო თესტაძე',
    gender: 'female',
    birth: { name: 'ნინო თესტაძე', year: 1992, month: 7, day: 3, hour: 9, minute: 15,
      latitude: 41.7151, longitude: 44.8271, timezone: 'Asia/Tbilisi', city: 'Tbilisi, Georgia' },
  },
  {
    full_name: 'გიორგი სატესტო',
    gender: 'male',
    birth: { name: 'გიორგი სატესტო', year: 1988, month: 11, day: 14, hour: 22, minute: 40,
      latitude: 41.7151, longitude: 44.8271, timezone: 'Asia/Tbilisi', city: 'Tbilisi, Georgia' },
  },
];

async function seedUser(seed: Seed): Promise<string> {
  const id = Math.random().toString(36).slice(2, 8);
  const email = `syn-${id}@astrolo.ge`;
  const password = 'testuser123';

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: seed.full_name },
  });
  if (authErr || !authUser?.user) throw new Error(`createUser failed: ${authErr?.message}`);
  const userId = authUser.user.id;

  await admin.from('users').upsert({
    id: userId,
    email,
    full_name: seed.full_name,
    birth_day: seed.birth.day,
    birth_month: seed.birth.month,
    birth_year: seed.birth.year,
    birth_hour: seed.birth.hour,
    birth_minute: seed.birth.minute,
    birth_city: seed.birth.city,
    birth_lat: seed.birth.latitude,
    birth_lng: seed.birth.longitude,
    birth_timezone: seed.birth.timezone,
    gender: seed.gender,
    account_type: 'premium',
    natal_chart_unlocked: true,
  }, { onConflict: 'id' });

  console.log(`  · ${seed.full_name} (${email}) → fetching chart…`);
  const { context, chartData } = await getChartData(seed.birth);

  await admin.from('chart_data').upsert({
    user_id: userId,
    api_response: chartData,
    chart_context: context,
  }, { onConflict: 'user_id' });

  console.log('    chart stored, running Call 1…');
  const call1 = await runNatalCall1(context);

  await admin.from('natal_readings').upsert({
    user_id: userId,
    share_slug: generateShareSlug(),
    analysis_en: call1.analysis,
    prompt_version: PROMPT_VERSION,
    model_call1: call1.model,
    tokens_call1: call1.tokens,
  }, { onConflict: 'user_id' });

  console.log(`    Call 1 done (${call1.tokens} tok, ${call1.analysis.length} chars)`);
  return userId;
}

async function main() {
  console.log('Seeding synastry pair…');
  const ids: string[] = [];
  for (const seed of SEEDS) {
    ids.push(await seedUser(seed));
  }
  console.log('\n=== SEEDED ===');
  console.log('user1_id:', ids[0]);
  console.log('user2_id:', ids[1]);
  console.log('\nNext: POST /api/dev/test-synastry { user1_id, user2_id, relationship_type: "couple" }');
}

main().catch((e) => { console.error(e); process.exit(1); });
