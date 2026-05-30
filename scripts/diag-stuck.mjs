// Read-only: identify owners of stuck premium rows + recent readings. No API spend.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: rows } = await supabase
  .from('natal_readings')
  .select('id, user_id, analysis_en, reading_ka, model_call2, prompt_version, generation_status, generation_started_at, generation_finished_at, created_at')
  .order('created_at', { ascending: false })
  .limit(40);

const { data: users } = await supabase
  .from('users')
  .select('id, email, account_type, natal_chart_unlocked');
const byId = new Map((users ?? []).map(u => [u.id, u]));

console.log('=== 40 most recent natal_readings rows ===');
for (const r of rows) {
  const u = byId.get(r.user_id);
  const state = r.reading_ka ? 'COMPLETE' : (r.analysis_en ? 'STUCK(call1-only)' : 'EMPTY');
  console.log(
    r.created_at?.slice(0,19),
    '|', state.padEnd(17),
    '|', (u?.email ?? '??').padEnd(32),
    '|', (u?.account_type ?? '?').padEnd(9),
    '| unlock=' + (u?.natal_chart_unlocked ? 'Y' : 'n'),
    '| gen=' + String(r.generation_status),
    '| m2=' + String(r.model_call2),
    '| pv=' + String(r.prompt_version),
  );
}
