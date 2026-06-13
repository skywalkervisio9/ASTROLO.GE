// Empirically time a real Call 2 (Gemini Flash) to test the 60s-cap theory.
// Uses an existing user's intact Call 1 analysis + chart context from prod.
// Replicates runNatalCall2's user message + token caps exactly. KA + EN run in
// parallel (as in prod); each is timed individually. Costs ~2 Gemini calls.
//
//   npx tsx scripts/time-call2.ts [email]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { callClaude } from '@/lib/AIgeneration/client';
import { getNatalCall2Prompt } from '@/lib/AIgeneration/prompts/natal';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const EMAIL = process.argv[2] || 'besotest@gmail.com';

type Timed =
  | { label: string; sec: number; ok: true; model: string; inTok: number; outTok: number; chars: number }
  | { label: string; sec: number; ok: false; error: string };

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: u } = await supabase.from('users').select('id').eq('email', EMAIL).maybeSingle();
  if (!u) { console.log('No user for', EMAIL); process.exit(1); }

  const { data: r } = await supabase
    .from('natal_readings').select('analysis_en').eq('user_id', u.id).maybeSingle();
  const { data: c } = await supabase
    .from('chart_data').select('chart_context, aspects').eq('user_id', u.id).maybeSingle();

  if (!r?.analysis_en || !c?.chart_context) { console.log('Missing analysis or chart_context'); process.exit(1); }

  const analysis: string = r.analysis_en;
  const chartContext: string = c.chart_context;
  const chartAspects = (c.aspects as Array<{ planet1: string; planet2: string; aspect: string; orb: number }> | null) ?? [];

  const aspectsSection = chartAspects.length > 0
    ? `\n\nKey Aspects (interpret 2–5 of these in aspectInterpretations — see schema rules):\n${chartAspects.map(a => `${a.planet1} ${a.aspect} ${a.planet2} (orb ${a.orb}°)`).join('\n')}`
    : '';
  const userMsg = `Chart Analysis:\n${analysis}\n\nOriginal Chart Data:\n${chartContext}${aspectsSection}`;

  console.log(`Email: ${EMAIL}`);
  console.log(`analysis_en chars: ${analysis.length}  | userMsg chars: ${userMsg.length}  | aspects: ${chartAspects.length}`);
  console.log('Generating KA (cap 32000) + EN (cap 20000) in parallel via', process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC' : 'GEMINI', '...\n');

  const timed = async (label: string, lang: 'ka' | 'en', maxTokens: number): Promise<Timed> => {
    const start = Date.now();
    try {
      const res = await callClaude(getNatalCall2Prompt(lang), userMsg, maxTokens);
      const sec = (Date.now() - start) / 1000;
      return { label, sec, ok: true, model: res.model, inTok: res.inputTokens, outTok: res.outputTokens, chars: res.text.length };
    } catch (err) {
      const sec = (Date.now() - start) / 1000;
      return { label, sec, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const t0 = Date.now();
  const [ka, en] = await Promise.all([timed('KA', 'ka', 32000), timed('EN', 'en', 20000)]);
  const totalSec = (Date.now() - t0) / 1000;

  const line = (x: Timed) => x.ok
    ? `${x.label}: ${x.sec.toFixed(1)}s  | model=${x.model} in=${x.inTok} out=${x.outTok} chars=${x.chars}`
    : `${x.label}: ${x.sec.toFixed(1)}s  | FAILED: ${x.error}`;

  console.log('=== RESULTS ===');
  console.log(line(ka));
  console.log(line(en));
  console.log(`parallel wall-clock total: ${totalSec.toFixed(1)}s`);
  console.log('');
  const bottleneck = Math.max(ka.sec, en.sec);
  console.log(`bottleneck (slowest single language): ${bottleneck.toFixed(1)}s`);
  console.log(`Hobby 60s cap → this generation would have ${bottleneck > 60 || totalSec > 60 ? 'BEEN KILLED ❌' : 'survived ✅'}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
