// Read-only: scan completed readings for SILENT thin-KA failures. No API spend.
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

const MIN = { overview: 3, mission: 4, characteristics: 4, relationships: 4, work: 4, shadow: 4, spiritual: 4, potential: 2 };
const SECTIONS = Object.keys(MIN);

function cardCount(sec) {
  if (!sec) return null;
  const cards = sec.coreCards ?? sec.cards ?? null;
  return Array.isArray(cards) ? cards.length : null;
}

// How many sections fall below their min-card threshold
function deficits(reading) {
  if (!reading || typeof reading !== 'object') return null;
  let below = 0, missing = 0, totalCards = 0;
  for (const k of SECTIONS) {
    const n = cardCount(reading[k]);
    if (n === null) { missing++; continue; }
    totalCards += n;
    if (n < MIN[k]) below++;
  }
  return { below, missing, totalCards };
}

const { data: rows } = await supabase
  .from('natal_readings')
  .select('id, user_id, reading_ka, reading_en, model_call2, tokens_call2_ka, created_at')
  .not('reading_ka', 'is', null);

const { data: users } = await supabase.from('users').select('id, email, account_type');
const byId = new Map((users ?? []).map(u => [u.id, u]));

// Total min cards across all sections = 29. Healthy readings land ~27-29.
// BROKEN  = empty/skeletal: any missing section, or <18 total cards (<~60% of target)
// MARGINAL= real content but a bit short: 18-26 cards
// HEALTHY = 27+ cards
let healthy = 0;
const broken = [], marginal = [];

for (const r of rows) {
  const d = deficits(r.reading_ka);
  if (!d) continue;
  const rec = { ...d, id: r.id, email: byId.get(r.user_id)?.email ?? '??', tok_ka: r.tokens_call2_ka, created: r.created_at?.slice(0,10), m2: r.model_call2 };
  if (d.missing > 0 || d.totalCards < 18) broken.push(rec);
  else if (d.totalCards < 27) marginal.push(rec);
  else healthy++;
}

broken.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

console.log('=== KA reading health (rows with reading_ka present) ===');
console.log('total with reading_ka :', rows.length);
console.log('HEALTHY (27+ cards)   :', healthy, `(${(100*healthy/rows.length).toFixed(1)}%)`);
console.log('MARGINAL (18-26 cards):', marginal.length, `(${(100*marginal.length/rows.length).toFixed(1)}%)`);
console.log('BROKEN (<18 or missing):', broken.length, `(${(100*broken.length/rows.length).toFixed(1)}%)`);

console.log('\n=== BROKEN KA rows (skeletal/empty — most recent first) ===');
for (const t of broken) {
  console.log(
    (t.created||'').padEnd(11),
    '| below=' + t.below, 'missing=' + t.missing, 'cards=' + String(t.totalCards).padStart(2),
    '| tok_ka=' + String(t.tok_ka).padEnd(6),
    '| m2=' + String(t.m2).padEnd(16),
    '|', t.email,
  );
}
