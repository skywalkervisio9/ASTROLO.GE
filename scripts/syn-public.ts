import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const conn = 'c9724d7e-89e7-41fb-9900-12ff6ab7fd74';

async function main() {
  const { data } = await admin.from('synastry_readings').select('share_slug, is_public').eq('connection_id', conn).maybeSingle();
  console.log('before:', JSON.stringify(data));
  if (data && !data.is_public) {
    await admin.from('synastry_readings').update({ is_public: true }).eq('connection_id', conn);
    console.log('set is_public=true');
  }
  console.log('slug:', data?.share_slug);
}
main().catch((e) => { console.error(e); process.exit(1); });
