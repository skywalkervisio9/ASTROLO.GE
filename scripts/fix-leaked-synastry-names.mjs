// Backfill: scrub leaked system-prompt example names (Nino/ნინო/Giorgi/გიორგი)
// from already-stored synastry readings. Mirrors scrubPromptExampleNames() in
// lib/synastry/run-generation.ts.
//
//   node scripts/fix-leaked-synastry-names.mjs          # dry run (report only)
//   node scripts/fix-leaked-synastry-names.mjs --apply  # write fixes back
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const APPLY = process.argv.includes('--apply');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const EXAMPLE_NAME_GROUPS = [
  { forms: ['ნინო', 'Nino'], person: 'A' },
  { forms: ['გიორგი', 'Giorgi'], person: 'B' },
];
function isUsableDisplayName(name) {
  const n = (name ?? '').trim();
  return n.length > 0 && n.length <= 40 && !n.includes('@');
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function boundaryRe(from) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(from)}(?![\\p{L}\\p{N}])`, 'gu');
}
function deepReplace(value, re, to) {
  if (typeof value === 'string') return value.replace(re, () => to);
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, re, to));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepReplace(v, re, to);
    return out;
  }
  return value;
}
function normalizeFirstName(name, fallback) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return fallback;
  const first = trimmed.split(/\s+/)[0];
  if (/^[A-Za-z]+$/.test(first)) return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return first;
}
function countMatches(reading, from) {
  const re = boundaryRe(from);
  let n = 0;
  const walk = (v) => {
    if (typeof v === 'string') { const m = v.match(re); if (m) n += m.length; }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(reading);
  return n;
}
function scrub(reading, personAName, personBName) {
  const realLower = new Set([personAName.toLowerCase(), personBName.toLowerCase()]);
  let next = reading;
  const changed = {};
  for (const { forms, person } of EXAMPLE_NAME_GROUPS) {
    if (forms.some((f) => realLower.has(f.toLowerCase()))) continue;
    const to = person === 'A' ? personAName : personBName;
    if (!isUsableDisplayName(to)) continue;
    for (const form of forms) {
      const before = countMatches(next, form);
      if (!before) continue;
      next = deepReplace(next, boundaryRe(form), to);
      changed[form] = { count: before, to };
    }
  }
  return { next, changed };
}

const { data: readings, error } = await supabase
  .from('synastry_readings')
  .select('id, connection_id, reading_ka, reading_en')
  .order('created_at', { ascending: false });
if (error) { console.log('ERR', error.message); process.exit(1); }

let touched = 0;
for (const r of readings) {
  const { data: conn } = await supabase
    .from('synastry_connections').select('inviter_id, invitee_id').eq('id', r.connection_id).maybeSingle();
  const ids = [conn?.inviter_id, conn?.invitee_id].filter(Boolean);
  const { data: users } = ids.length
    ? await supabase.from('users').select('id, full_name').in('id', ids)
    : { data: [] };
  const nameOf = (id) => (users || []).find((u) => u.id === id)?.full_name ?? '';
  const personAName = normalizeFirstName(nameOf(conn?.inviter_id), 'Friend1');
  const personBName = normalizeFirstName(nameOf(conn?.invitee_id), 'Friend2');

  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  const ka = r.reading_ka ? parse(r.reading_ka) : null;
  const en = r.reading_en ? parse(r.reading_en) : null;

  const kaRes = ka ? scrub(ka, personAName, personBName) : { next: ka, changed: {} };
  const enRes = en ? scrub(en, personAName, personBName) : { next: en, changed: {} };

  const kaChanged = Object.keys(kaRes.changed).length > 0;
  const enChanged = Object.keys(enRes.changed).length > 0;
  if (!kaChanged && !enChanged) continue;

  touched++;
  console.log(`\n${r.id}  A=${personAName}  B=${personBName}`);
  if (kaChanged) console.log('  KA:', JSON.stringify(kaRes.changed));
  if (enChanged) console.log('  EN:', JSON.stringify(enRes.changed));

  if (APPLY) {
    const patch = {};
    if (kaChanged) patch.reading_ka = kaRes.next;
    if (enChanged) patch.reading_en = enRes.next;
    const { error: upErr } = await supabase.from('synastry_readings').update(patch).eq('id', r.id);
    console.log(upErr ? `  ✗ write failed: ${upErr.message}` : '  ✓ written');
  }
}

console.log(`\n${APPLY ? 'Applied to' : 'Would fix'} ${touched} reading(s).${APPLY ? '' : '  Re-run with --apply to write.'}`);
