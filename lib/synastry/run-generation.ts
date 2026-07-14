// ============================================================
// Shared synastry AI generation (used by internal + user-triggered routes)
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateSynastryReading } from '@/lib/AIgeneration/pipeline';
import { generateShareSlug } from '@/lib/chart/reading-helpers';
import { extractSynastryScores } from '@/lib/synastry/share-helpers';
import { runNatalCall1 } from '@/lib/AIgeneration/pipeline';
import { PROMPT_VERSION } from '@/lib/AIgeneration/prompts/natal';
import { normalizeFirstName } from '@/lib/AIgeneration/prompts/synastry';

export type SynastryGenResult =
  | { ok: true; status: 'complete' | 'already_complete' }
  | { ok: false; error: string; httpStatus: number };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replace `from` with `to` only where `from` stands alone as a word — never
// when it sits inside a larger word. A naive split/join rewrites substrings:
// when the model spells a Latin name in Georgian (e.g. "ანა") and we normalize
// it back to "Ana", "ანა" also appears inside unrelated Georgian words
// ("ამოცანაა" → "ამოცAnaა"). \p{L}/\p{N} cover Latin + Georgian letters and
// digits on both sides, so only free-standing occurrences are replaced.
function buildNameBoundaryRegExp(from: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(from)}(?![\\p{L}\\p{N}])`, 'gu');
}

function deepReplace(value: unknown, re: RegExp, to: string): unknown {
  if (typeof value === 'string') return value.replace(re, () => to);
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, re, to));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepReplace(v, re, to);
    }
    return out;
  }
  return value;
}

function deepNameNormalize(value: unknown, from: string, to: string): unknown {
  if (!from || from === to) return value;
  return deepReplace(value, buildNameBoundaryRegExp(from), to);
}

function enforcePersonNames(
  reading: Record<string, unknown>,
  personAName: string,
  personBName: string,
): Record<string, unknown> {
  let next = reading;
  const meta = reading.meta as Record<string, unknown> | undefined;
  const a = meta?.personA as Record<string, unknown> | undefined;
  const b = meta?.personB as Record<string, unknown> | undefined;
  const generatedA = typeof a?.name === 'string' ? a.name : '';
  const generatedB = typeof b?.name === 'string' ? b.name : '';

  if (generatedA && generatedA !== personAName) {
    next = deepNameNormalize(next, generatedA, personAName) as Record<string, unknown>;
  }
  if (generatedB && generatedB !== personBName) {
    next = deepNameNormalize(next, generatedB, personBName) as Record<string, unknown>;
  }

  const m = (next.meta as Record<string, unknown> | undefined) ?? {};
  const pa = (m.personA as Record<string, unknown> | undefined) ?? {};
  const pb = (m.personB as Record<string, unknown> | undefined) ?? {};
  return {
    ...next,
    meta: {
      ...m,
      personA: { ...pa, name: personAName },
      personB: { ...pb, name: personBName },
    },
  };
}

async function ensureCall1Analysis(
  userId: string,
  chartContext: string | null | undefined,
  existingAnalysis: string | null | undefined,
): Promise<{ analysis: string | null; model?: string; tokens?: number }> {
  if (existingAnalysis) return { analysis: existingAnalysis };
  if (!chartContext) return { analysis: null };

  const call1 = await runNatalCall1(chartContext);
  return {
    analysis: call1.analysis,
    model: call1.model,
    tokens: call1.tokens,
  };
}

export async function runSynastryGeneration(connectionId: string): Promise<SynastryGenResult> {
  const admin = createAdminSupabase();

  const { data: conn, error: connErr } = await admin
    .from('synastry_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (connErr || !conn) {
    return { ok: false, error: 'Connection not found', httpStatus: 404 };
  }

  if (conn.status === 'reading_generated') {
    return { ok: true, status: 'already_complete' };
  }

  if (!conn.invitee_id) {
    return { ok: false, error: 'Invite not accepted yet', httpStatus: 400 };
  }

  const [{ data: inviterData }, { data: inviteeData }] = await Promise.all([
    admin.from('natal_readings').select('analysis_en').eq('user_id', conn.inviter_id).maybeSingle(),
    admin.from('natal_readings').select('analysis_en').eq('user_id', conn.invitee_id).maybeSingle(),
  ]);

  const [{ data: inviterChart }, { data: inviteeChart }] = await Promise.all([
    admin.from('chart_data').select('chart_context').eq('user_id', conn.inviter_id).maybeSingle(),
    admin.from('chart_data').select('chart_context').eq('user_id', conn.invitee_id).maybeSingle(),
  ]);

  const [inviterCall1, inviteeCall1] = await Promise.all([
    ensureCall1Analysis(conn.inviter_id, inviterChart?.chart_context ?? null, inviterData?.analysis_en ?? null),
    ensureCall1Analysis(conn.invitee_id, inviteeChart?.chart_context ?? null, inviteeData?.analysis_en ?? null),
  ]);

  if (!inviterCall1.analysis || !inviteeCall1.analysis) {
    return { ok: false, error: 'Both users need valid chart data for Call 1', httpStatus: 400 };
  }

  const maybeCall1Upserts = [];
  if (!inviterData?.analysis_en && inviterCall1.analysis) {
    maybeCall1Upserts.push(
      admin.from('natal_readings').upsert(
        {
          user_id: conn.inviter_id,
          analysis_en: inviterCall1.analysis,
          model_call1: inviterCall1.model,
          tokens_call1: inviterCall1.tokens,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'user_id' },
      ),
    );
  }
  if (!inviteeData?.analysis_en && inviteeCall1.analysis) {
    maybeCall1Upserts.push(
      admin.from('natal_readings').upsert(
        {
          user_id: conn.invitee_id,
          analysis_en: inviteeCall1.analysis,
          model_call1: inviteeCall1.model,
          tokens_call1: inviteeCall1.tokens,
          prompt_version: PROMPT_VERSION,
        },
        { onConflict: 'user_id' },
      ),
    );
  }
  if (maybeCall1Upserts.length > 0) {
    await Promise.all(maybeCall1Upserts);
  }

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, gender')
    .in('id', [conn.inviter_id, conn.invitee_id]);

  const nameMap = new Map((users ?? []).map((u) => [u.id, u.full_name ?? 'Unknown']));

  // v6: pass first-name-only to both the prompt and the post-processor so the
  // model's normalized output isn't undone by enforcePersonNames.
  const personAName = normalizeFirstName(nameMap.get(conn.inviter_id) ?? '', 'Friend1');
  const personBName = normalizeFirstName(nameMap.get(conn.invitee_id) ?? '', 'Friend2');
  const result = await generateSynastryReading({
    personAName,
    personAAnalysis: inviterCall1.analysis,
    personAChartContext: inviterChart?.chart_context ?? '',
    personBName,
    personBAnalysis: inviteeCall1.analysis,
    personBChartContext: inviteeChart?.chart_context ?? '',
    relationshipType: conn.relationship_type,
  });
  const normalizedKa = enforcePersonNames(result.readingKa as Record<string, unknown>, personAName, personBName);
  const normalizedEn = enforcePersonNames(result.readingEn as Record<string, unknown>, personAName, personBName);

  // Inject each person's gender into meta so the UI (aspect-wheel colours) has it.
  const genderMap = new Map((users ?? []).map((u) => [u.id, (u as { gender?: string | null }).gender ?? null]));
  const injectGender = (reading: Record<string, unknown>) => {
    const meta = reading.meta as { personA?: Record<string, unknown>; personB?: Record<string, unknown> } | undefined;
    if (meta?.personA) meta.personA.gender = genderMap.get(conn.inviter_id) ?? null;
    if (meta?.personB) meta.personB.gender = genderMap.get(conn.invitee_id) ?? null;
  };
  injectGender(normalizedKa);
  injectGender(normalizedEn);

  const { data: existingRow } = await admin
    .from('synastry_readings')
    .select('share_slug')
    .eq('connection_id', connectionId)
    .maybeSingle();

  const shareSlug =
    typeof existingRow?.share_slug === 'string' && existingRow.share_slug
      ? existingRow.share_slug
      : generateShareSlug();

  const scores = extractSynastryScores(normalizedEn);

  const { error: saveErr } = await admin
    .from('synastry_readings')
    .upsert(
      {
        connection_id: connectionId,
        user1_id: conn.inviter_id,
        user2_id: conn.invitee_id,
        relationship_type: conn.relationship_type,
        analysis_en: result.analysis,
        reading_ka: normalizedKa,
        reading_en: normalizedEn,
        compatibility_score: scores.compatibility_score ?? undefined,
        category_scores: scores.category_scores ?? undefined,
        share_slug: shareSlug,
      },
      { onConflict: 'connection_id' }
    );

  if (saveErr) {
    console.error('[runSynastryGeneration] save error:', saveErr);
    return { ok: false, error: saveErr.message, httpStatus: 500 };
  }

  await admin.from('synastry_connections').update({ status: 'reading_generated' }).eq('id', connectionId);

  return { ok: true, status: 'complete' };
}
