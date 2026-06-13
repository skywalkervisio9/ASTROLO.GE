// Read-only diagnostic: inspect the most recent natal + synastry generations.
// Usage: node scripts/check-last-generation.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Minimal .env.local loader (no dotenv dependency).
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function preview(v) {
  if (v == null) return null;
  if (typeof v === 'object') return `<json ${JSON.stringify(v).length} chars>`;
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
}

const orderCandidates = ['updated_at', 'created_at', 'id'];

async function latest(table, cols) {
  for (const orderCol of orderCandidates) {
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .order(orderCol, { ascending: false })
      .limit(5);
    if (!error) return { rows: data, orderCol };
    if (!/column .* does not exist/i.test(error.message)) {
      return { error: error.message };
    }
  }
  return { error: 'no usable order column' };
}

console.log('=== natal_readings (latest 5) ===');
{
  const { rows, orderCol, error } = await latest('natal_readings', '*');
  if (error) console.log('ERROR:', error);
  else {
    console.log(`(ordered by ${orderCol})`);
    for (const r of rows) {
      console.log({
        id: r.id,
        user_id: r.user_id,
        has_analysis_en: !!r.analysis_en,
        has_reading_ka: !!r.reading_ka,
        has_reading_en: !!r.reading_en,
        model_call1: r.model_call1,
        model_call2: r.model_call2,
        tokens_ka: r.tokens_call2_ka,
        tokens_en: r.tokens_call2_en,
        prompt_version: r.prompt_version,
        validation_warnings: r.validation_warnings,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    }
  }
}

console.log('\n=== synastry_connections (latest 5) ===');
{
  const { rows, orderCol, error } = await latest('synastry_connections', '*');
  if (error) console.log('ERROR:', error);
  else {
    console.log(`(ordered by ${orderCol})`);
    for (const r of rows) {
      console.log({
        id: r.id,
        status: r.status,
        relationship_type: r.relationship_type,
        inviter_id: r.inviter_id,
        invitee_id: r.invitee_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    }
  }
}

console.log('\n=== synastry_readings (latest 5) ===');
{
  const { rows, orderCol, error } = await latest('synastry_readings', '*');
  if (error) console.log('ERROR:', error);
  else {
    console.log(`(ordered by ${orderCol})`);
    for (const r of rows) {
      console.log({
        id: r.id,
        connection_id: r.connection_id,
        relationship_type: r.relationship_type,
        has_reading_ka: !!r.reading_ka,
        has_reading_en: !!r.reading_en,
        compatibility_score: r.compatibility_score,
        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    }
  }
}
