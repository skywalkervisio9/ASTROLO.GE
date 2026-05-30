// Read-only deep analysis of natal generation outcomes. No API spend.
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

// Pull all natal_readings + the owning user's account_type.
const { data: rows, error } = await supabase
  .from('natal_readings')
  .select('id, user_id, analysis_en, reading_ka, reading_en, model_call2, tokens_call2_ka, tokens_call2_en, prompt_version, validation_warnings, created_at, generation_status, generation_started_at, generation_finished_at');
if (error) { console.log('ERROR readings:', error.message); process.exit(1); }

const { data: users, error: uErr } = await supabase
  .from('users')
  .select('id, account_type, natal_chart_unlocked');
if (uErr) { console.log('ERROR users:', uErr.message); }
const acct = new Map((users ?? []).map(u => [u.id, u]));

function isPremiumish(u) {
  if (!u) return false;
  return u.account_type === 'premium' || u.account_type === 'invited+' || u.natal_chart_unlocked === true;
}

let complete = 0, stuckPremium = 0, call1OnlyInvited = 0, emptyRow = 0, other = 0;
const kaTokens = [], enTokens = [];
const stuckRows = [];

for (const r of rows) {
  const u = acct.get(r.user_id);
  const hasAnalysis = !!r.analysis_en;
  const hasKa = !!r.reading_ka;
  if (hasKa) {
    complete++;
    if (typeof r.tokens_call2_ka === 'number') kaTokens.push(r.tokens_call2_ka);
    if (typeof r.tokens_call2_en === 'number') enTokens.push(r.tokens_call2_en);
  } else if (hasAnalysis) {
    // analysis present but no reading
    if (isPremiumish(u)) { stuckPremium++; stuckRows.push({ id: r.id, acct: u?.account_type, created: r.created_at, model2: r.model_call2, pv: r.prompt_version, gen: r.generation_status }); }
    else if (u?.account_type === 'invited' || u?.account_type === 'invited+') call1OnlyInvited++;
    else { other++; stuckRows.push({ id: r.id, acct: u?.account_type, created: r.created_at, note: 'analysis-no-reading, non-premium' }); }
  } else {
    emptyRow++;
  }
}

function stats(arr) {
  if (!arr.length) return 'none';
  const s = [...arr].sort((a, b) => a - b);
  const pct = (p) => s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))];
  const avg = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
  return `n=${s.length} min=${s[0]} p50=${pct(50)} p90=${pct(90)} max=${s[s.length-1]} avg=${avg}`;
}

console.log('=== natal_readings outcome breakdown ===');
console.log('total rows:', rows.length);
console.log('complete (reading_ka present):', complete);
console.log('STUCK premium-ish (analysis, no reading):', stuckPremium);
console.log('invited Call-1-only (by design):', call1OnlyInvited);
console.log('empty rows (no analysis, no reading):', emptyRow);
console.log('other analysis-no-reading:', other);
console.log('\napprox premium full-reading success rate:',
  complete + stuckPremium > 0 ? `${(100 * complete / (complete + stuckPremium)).toFixed(1)}% (${complete}/${complete + stuckPremium})` : 'n/a');

console.log('\n=== Call 2 token distribution (completed rows; tokens = in+out) ===');
console.log('KA:', stats(kaTokens));
console.log('EN:', stats(enTokens));

console.log('\n=== stuck / anomalous rows ===');
for (const s of stuckRows) console.log(s);

console.log('\n=== generation_status values seen ===');
const gs = {};
for (const r of rows) { const k = String(r.generation_status); gs[k] = (gs[k] ?? 0) + 1; }
console.log(gs);
