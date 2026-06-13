// Read-only: discover the actual columns on natal_readings (1 row, all keys).
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

const { data, error } = await supabase.from('natal_readings').select('*').limit(1).maybeSingle();
if (error) { console.log('ERROR:', error.message); process.exit(1); }
console.log('natal_readings columns:');
console.log(Object.keys(data ?? {}).sort().join('\n'));
