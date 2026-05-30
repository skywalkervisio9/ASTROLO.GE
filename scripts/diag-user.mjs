// One-off read-only diagnostic for a single user's natal reading. No API spend.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const EMAIL = process.argv[2] || 'lukacho1199@gmail.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Find the auth user via the users table (mirrors auth.users.id)
const { data: u, error: uErr } = await supabase
  .from('users')
  .select('id, email, account_type, natal_chart_unlocked')
  .eq('email', EMAIL)
  .maybeSingle();
if (uErr) { console.log('users error:', uErr.message); process.exit(1); }
if (!u) { console.log('No user row for', EMAIL); process.exit(0); }

console.log('=== USER ===');
console.log(u);

const { data: r, error: rErr } = await supabase
  .from('natal_readings')
  .select('*')
  .eq('user_id', u.id)
  .maybeSingle();
if (rErr) { console.log('natal_readings error:', rErr.message); process.exit(1); }
if (!r) { console.log('\nNo natal_readings row.'); process.exit(0); }

const SECTIONS = ['overview','mission','characteristics','relationships','work','shadow','spiritual','potential'];

function cardCounts(reading) {
  if (!reading || typeof reading !== 'object') return '(null)';
  return SECTIONS.map(k => {
    const sec = reading[k];
    if (!sec) return `${k}=MISSING`;
    const cards = sec.coreCards ?? sec.cards ?? null;
    const n = Array.isArray(cards) ? cards.length : 'no-cards-array';
    return `${k}=${n}`;
  }).join('  ');
}

console.log('\n=== ROW META ===');
console.log({
  id: r.id,
  share_slug: r.share_slug,
  is_public: r.is_public,
  generation_status: r.generation_status,
  generation_started_at: r.generation_started_at,
  generation_finished_at: r.generation_finished_at,
  prompt_version: r.prompt_version,
  model_call1: r.model_call1,
  model_call2: r.model_call2,
  tokens_call1: r.tokens_call1,
  tokens_call2_ka: r.tokens_call2_ka,
  tokens_call2_en: r.tokens_call2_en,
  has_analysis_en: !!r.analysis_en,
  analysis_en_len: r.analysis_en ? r.analysis_en.length : 0,
  has_reading_ka: !!r.reading_ka,
  has_reading_en: !!r.reading_en,
  created_at: r.created_at,
});

console.log('\n=== validation_warnings ===');
console.log(r.validation_warnings ?? '(none)');

console.log('\n=== KA card counts ===');
console.log(cardCounts(r.reading_ka));
console.log('\n=== EN card counts ===');
console.log(cardCounts(r.reading_en));

// Top-level keys present
if (r.reading_ka) console.log('\nKA top-level keys:', Object.keys(r.reading_ka).join(', '));
if (r.reading_en) console.log('EN top-level keys:', Object.keys(r.reading_en).join(', '));
