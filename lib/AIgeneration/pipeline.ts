// ============================================================
// Two-call AI pipeline — Natal + Synastry generation
// Call 1: Chart analysis (English, internal)
// Call 2: Full reading (Georgian + English, client-facing)
// ============================================================

import { callClaude } from './client';
import {
  normalizeNatalReadingShape,
  parseClaudeJSON,
  validateNatalReading,
  validateSynastryReading,
  assessNatalReadingQuality,
  SECTION_MIN_CARDS,
  PARITY_MIN_RATIO,
  type ReadingQuality,
} from './validator';
import {
  getNatalCall1Prompt,
  getNatalCall2Prompt,
} from './prompts/natal';
import {
  getSynastryPrompt,
  buildSynastryUserMessage,
} from './prompts/synastry';
import type { Language } from '@/types/user';
import { SECTION_KEYS } from '@/types/reading';

// One retry only — generate-full has a 300s server budget and KA generation
// can land at 3–4 min on its own. A second retry reliably blows the budget,
// triggering a Vercel kill that leaves the row stuck in 'generating'.
const MAX_RETRIES = 1;
const JSON_REPAIR_MAX_CHARS = 120000;

/**
 * Tier-1 quality-floor failure. Thrown by runNatalCall2 when a reading is too
 * hollow to ship even after one top-up pass (absolute floor or KA/EN parity).
 * generate-full catches this and records generation_status='failed' so the
 * loading screen can surface Retry instead of saving a skeletal reading.
 */
export class ReadingTooThinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadingTooThinError';
  }
}

// ── Natal reading pipeline ──

export interface AspectInterpretation {
  planet1: string;
  planet2: string;
  aspect: string;
  interpretation: string; // single language — matches the Call 2 language
  significance: 'high' | 'normal';
}

export interface NatalPipelineResult {
  analysis: string;
  readingKa: Record<string, unknown>;
  readingEn: Record<string, unknown>;
  aspectInterpretationsKa: AspectInterpretation[];
  aspectInterpretationsEn: AspectInterpretation[];
  meta: {
    modelCall1: string;
    modelCall2: string;
    tokensCall1: number;
    tokensCall2Ka: number;
    tokensCall2En: number;
    validationWarnings: string[];
  };
}

export interface Call1Result {
  analysis: string;
  model: string;
  tokens: number;
}

export interface Call2Result {
  readingKa: Record<string, unknown>;
  readingEn: Record<string, unknown>;
  aspectInterpretationsKa: AspectInterpretation[];
  aspectInterpretationsEn: AspectInterpretation[];
  meta: {
    modelCall2: string;
    tokensCall2Ka: number;
    tokensCall2En: number;
    validationWarnings: string[];
  };
}

/** Call 1 only — chart analysis (English plain text). Used for invited users (synastry input). */
export async function runNatalCall1(chartContext: string): Promise<Call1Result> {
  const call1 = await callClaude(
    getNatalCall1Prompt(),
    `Analyze this natal chart:\n\n${chartContext}`,
    16000,
    false
  );
  return { analysis: call1.text, model: call1.model, tokens: call1.inputTokens + call1.outputTokens };
}

type SingleReading = Awaited<ReturnType<typeof generateSingleReading>>;

/**
 * Tier-1 quality gate assessment. Reports which language(s) are unshippable
 * (below the absolute floor, or the smaller side of a lopsided KA/EN pair) plus
 * a human-readable reason string. Empty `failing` ⟹ ship it.
 */
function assessCall2Quality(readingKa: SingleReading, readingEn: SingleReading): {
  failing: Language[];
  reasons: string;
} {
  const kaCards = readingKa.quality.totalCards;
  const enCards = readingEn.quality.totalCards;
  const maxCards = Math.max(kaCards, enCards, 1);
  const parityThin = Math.min(kaCards, enCards) < PARITY_MIN_RATIO * maxCards;

  const failing: Language[] = [];
  if (readingKa.quality.tooThin) failing.push('ka');
  if (readingEn.quality.tooThin) failing.push('en');
  // Lopsided but neither below the absolute floor: regenerate only the smaller
  // side — the fuller one is already good and must not be thrown away.
  if (parityThin) {
    const smaller: Language = kaCards <= enCards ? 'ka' : 'en';
    if (!failing.includes(smaller)) failing.push(smaller);
  }

  const reasons = [
    readingKa.quality.tooThin && `ka below floor (cards=${kaCards}, words≈${readingKa.quality.wordEstimate})`,
    readingEn.quality.tooThin && `en below floor (cards=${enCards}, words≈${readingEn.quality.wordEstimate})`,
    parityThin && `ka/en parity off (ka=${kaCards}, en=${enCards}, need ≥${Math.round(PARITY_MIN_RATIO * 100)}% of larger)`,
  ].filter(Boolean).join('; ');

  return { failing, reasons };
}

/** Call 2 only — full reading (KA + EN). Requires existing Call 1 analysis. */
export async function runNatalCall2(
  analysis: string,
  chartContext: string,
  chartAspects?: Array<{ planet1: string; planet2: string; aspect: string; orb: number }>,
  // Fired once, server-side, the moment a thin language is about to be
  // regenerated — lets generate-full stamp a transient "retrying" marker on the
  // row so /loading can flash a non-blocking notice and stretch its progress bar
  // by the retried call's cost. No user interaction; generation keeps running.
  onRetry?: (langs: Language[]) => void | Promise<void>
): Promise<Call2Result> {
  const aspectsSection = chartAspects && chartAspects.length > 0
    ? `\n\nKey Aspects (interpret 2–5 of these in aspectInterpretations — see schema rules):\n${chartAspects.map(a => `${a.planet1} ${a.aspect} ${a.planet2} (orb ${a.orb}°)`).join('\n')}`
    : '';
  const userMsg = `Chart Analysis:\n${analysis}\n\nOriginal Chart Data:\n${chartContext}${aspectsSection}`;

  let [readingKa, readingEn] = await Promise.all([
    generateSingleReading(userMsg, 'ka'),
    generateSingleReading(userMsg, 'en'),
  ]);

  // ── Tier-1 quality gate (selective auto-retry) ──
  // Each language already attempted ONE top-up pass inside generateSingleReading.
  // If a language is still below the absolute floor (or is the skeletal side of a
  // lopsided KA/EN pair — the bogpremium signature), regenerate ONLY that
  // language once. The healthy side is kept as-is, so a full EN is never thrown
  // away to repair a thin KA. We only give up (throw ReadingTooThinError) if the
  // reading is still unshippable after this targeted retry.
  let { failing, reasons } = assessCall2Quality(readingKa, readingEn);
  if (failing.length > 0) {
    console.warn(`[call2] thin after first pass (${reasons}) — regenerating: ${failing.join(', ')}`);
    await onRetry?.(failing);
    const [retriedKa, retriedEn] = await Promise.all([
      failing.includes('ka') ? generateSingleReading(userMsg, 'ka') : Promise.resolve(readingKa),
      failing.includes('en') ? generateSingleReading(userMsg, 'en') : Promise.resolve(readingEn),
    ]);
    // Guard against a retry that comes back thinner than the first draft — never
    // regress: keep whichever pass produced more cards for that language.
    if (failing.includes('ka') && retriedKa.quality.totalCards >= readingKa.quality.totalCards) readingKa = retriedKa;
    if (failing.includes('en') && retriedEn.quality.totalCards >= readingEn.quality.totalCards) readingEn = retriedEn;
    ({ failing, reasons } = assessCall2Quality(readingKa, readingEn));
  }

  if (failing.length > 0) {
    throw new ReadingTooThinError(`Reading too thin after selective retry: ${reasons}`);
  }

  const interpKa = readingKa.aspectInterpretations.length > 0
    ? readingKa.aspectInterpretations
    : readingEn.aspectInterpretations;
  const interpEn = readingEn.aspectInterpretations.length > 0
    ? readingEn.aspectInterpretations
    : readingKa.aspectInterpretations;

  return {
    readingKa: readingKa.parsed,
    readingEn: readingEn.parsed,
    aspectInterpretationsKa: interpKa,
    aspectInterpretationsEn: interpEn,
    meta: {
      modelCall2: readingKa.model,
      tokensCall2Ka: readingKa.inputTokens + readingKa.outputTokens,
      tokensCall2En: readingEn.inputTokens + readingEn.outputTokens,
      validationWarnings: [...readingKa.warnings, ...readingEn.warnings],
    },
  };
}

/** Full pipeline: Call 1 + Call 2. Used for premium users at signup (dev mode). */
export async function generateNatalReading(
  chartContext: string,
  chartAspects?: Array<{ planet1: string; planet2: string; aspect: string; orb: number }>
): Promise<NatalPipelineResult> {
  const call1 = await runNatalCall1(chartContext);
  const call2 = await runNatalCall2(call1.analysis, chartContext, chartAspects);

  return {
    analysis: call1.analysis,
    readingKa: call2.readingKa,
    readingEn: call2.readingEn,
    aspectInterpretationsKa: call2.aspectInterpretationsKa,
    aspectInterpretationsEn: call2.aspectInterpretationsEn,
    meta: {
      modelCall1: call1.model,
      modelCall2: call2.meta.modelCall2,
      tokensCall1: call1.tokens,
      tokensCall2Ka: call2.meta.tokensCall2Ka,
      tokensCall2En: call2.meta.tokensCall2En,
      validationWarnings: call2.meta.validationWarnings,
    },
  };
}

/** Extract and normalize aspectInterpretations from raw Call 2 JSON */
function extractAspectInterpretations(raw: Record<string, unknown>): AspectInterpretation[] {
  const arr = raw.aspectInterpretations;
  if (!Array.isArray(arr)) return [];
  return (arr as Record<string, unknown>[])
    .filter(item => item.planet1 && item.planet2 && item.aspect)
    .map(item => ({
      planet1: String(item.planet1),
      planet2: String(item.planet2),
      aspect: String(item.aspect),
      interpretation: String(item.interpretation || ''),
      significance: (item.significance === 'high' ? 'high' : 'normal') as 'high' | 'normal',
    }));
}

async function generateSingleReading(
  userMessage: string,
  language: Language
): Promise<{
  parsed: Record<string, unknown>;
  quality: ReadingQuality;
  aspectInterpretations: AspectInterpretation[];
  warnings: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const prompt = getNatalCall2Prompt(language);
  // Georgian is ~2 chars/token (Mkhedruli script); English is ~4 chars/token.
  // A full KA reading needs ~39–43k output tokens. The old 32k cap sat BELOW
  // that, so KA got truncated mid-JSON and the repair pass salvaged it down to a
  // skeleton (~9 cards), failing the Tier-1 floor + KA/EN parity gate while EN
  // (token-cheaper) shipped full. 44k clears the top of the observed range with
  // slack. The earlier fear of a 40k cap was the truncation→repair cascade
  // blowing a 300s function budget, but generate-full now runs with
  // maxDuration=600 and KA Call 2 measures ~168s at 32k (~230s projected at
  // 44k), so an untruncated single pass fits with headroom. Ceiling is safe for
  // both providers (Gemini 2.5 Flash and Claude Sonnet 4 cap output at ~64k).
  const maxTokens = language === 'ka' ? 44000 : 20000;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callClaude(prompt, userMessage, maxTokens);
      const raw = await parseOrRepairJSON(response.text) as Record<string, unknown>;
      // Extract aspect interpretations before normalization (normalizer would drop unknown keys)
      const aspectInterpretations = extractAspectInterpretations(raw);
      delete raw.aspectInterpretations;
      let parsed = normalizeNatalReadingShape(raw);
      let validation = validateNatalReading(parsed);

      if (!validation.valid) {
        const missingSections = extractMissingNatalSections(validation.errors);
        if (missingSections.length > 0 && missingSections.length < SECTION_KEYS.length) {
          const completion = await completeMissingNatalSections(parsed, userMessage, language, missingSections);
          parsed = normalizeNatalReadingShape({ ...parsed, ...completion });
          validation = validateNatalReading(parsed);
        }
      }

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // ── Tier-1 quality floor (one top-up attempt) ──
      // Structure is valid (all 8 keys present) but the content may be hollow
      // (bogpremium). Top up under-filled sections ONCE, then re-measure. We do
      // NOT throw on persistent thinness here — the cross-language parity gate
      // in runNatalCall2 makes the final ship/no-ship decision so we never spend
      // a second full-generation attempt (which would risk the 300s budget).
      let quality = assessNatalReadingQuality(parsed);
      if (quality.tooThin && quality.thinSections.length > 0 && quality.thinSections.length < SECTION_KEYS.length) {
        try {
          const topUp = await topUpThinNatalSections(parsed, userMessage, language, quality.thinSections);
          parsed = normalizeNatalReadingShape({ ...parsed, ...topUp });
          quality = assessNatalReadingQuality(parsed);
        } catch (topUpErr) {
          console.warn(`[${language}] thin-section top-up failed (keeping first draft):`, topUpErr);
        }
      }

      return {
        parsed,
        quality,
        aspectInterpretations,
        warnings: validation.warnings.map((w) => `[${language}] ${w}`),
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[${language}] Reading attempt ${attempt + 1} failed:`, err);
    }
  }

  throw lastError || new Error(`Reading generation failed after ${MAX_RETRIES + 1} attempts`);
}

// ── Synastry reading pipeline ──

export interface SynastryPipelineInput {
  personAName: string;
  personAAnalysis: string;
  personAChartContext: string;
  personBName: string;
  personBAnalysis: string;
  personBChartContext: string;
  relationshipType: 'couple' | 'friend';
}

export interface SynastryPipelineResult {
  analysis: string;
  readingKa: Record<string, unknown>;
  readingEn: Record<string, unknown>;
  meta: {
    modelCall1: string;
    modelCall2: string;
    tokensCall1: number;
    tokensCall2Ka: number;
    tokensCall2En: number;
    validationWarnings: string[];
  };
}

/**
 * Generate synastry reading — s4 pipeline (no Call 1).
 * Uses both users' existing natal analyses + chart contexts.
 */
export async function generateSynastryReading(
  input: SynastryPipelineInput
): Promise<SynastryPipelineResult> {
  const userMsg = buildSynastryUserMessage(
    input.personAName,
    input.personAAnalysis,
    input.personAChartContext,
    input.personBName,
    input.personBAnalysis,
    input.personBChartContext,
    input.relationshipType
  );

  // Generate KA and EN in parallel for ~2x speed
  const [readingKa, readingEn] = await Promise.all([
    generateSingleSynastryReading(userMsg, 'ka', input.relationshipType),
    generateSingleSynastryReading(userMsg, 'en', input.relationshipType),
  ]);

  return {
    analysis: `[s4: no Call 1 — used natal analyses for ${input.personAName} & ${input.personBName}]`,
    readingKa: readingKa.parsed,
    readingEn: readingEn.parsed,
    meta: {
      modelCall1: 'n/a',
      modelCall2: readingKa.model,
      tokensCall1: 0,
      tokensCall2Ka: readingKa.inputTokens + readingKa.outputTokens,
      tokensCall2En: readingEn.inputTokens + readingEn.outputTokens,
      validationWarnings: [...readingKa.warnings, ...readingEn.warnings],
    },
  };
}


async function generateSingleSynastryReading(
  userMessage: string,
  language: Language,
  relationshipType: 'couple' | 'friend'
): Promise<{
  parsed: Record<string, unknown>;
  warnings: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const prompt = getSynastryPrompt(relationshipType, language);
  const maxTokens = language === 'ka' ? 64000 : 36000;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callClaude(prompt, userMessage, maxTokens);
      const parsed = await parseOrRepairJSON(response.text) as Record<string, unknown>;
      const validation = validateSynastryReading(parsed, relationshipType);

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        parsed,
        warnings: validation.warnings.map((w) => `[${language}] ${w}`),
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[synastry-${relationshipType}-${language}] Attempt ${attempt + 1} failed:`, err);
    }
  }

  throw lastError || new Error(`Synastry reading generation failed after ${MAX_RETRIES + 1} attempts`);
}

async function parseOrRepairJSON(raw: string): Promise<unknown> {
  try {
    return parseClaudeJSON(raw);
  } catch (initialErr) {
    console.warn('[pipeline] Initial JSON parse failed, attempting repair pass', initialErr);
    console.warn('[pipeline] Raw response preview (first 500 chars):', raw.slice(0, 500));
    console.warn('[pipeline] Raw response tail (last 200 chars):', raw.slice(-200));
    console.warn('[pipeline] Raw response total length:', raw.length);
  }

  const repairSystemPrompt = [
    'You are a strict JSON repair engine.',
    'Output exactly one valid JSON object and nothing else.',
    'Do not add markdown, commentary, or explanation.',
    'Preserve original keys and values whenever possible.',
    'If text is truncated, keep structure valid and leave incomplete textual fields as shortest valid strings.',
  ].join(' ');

  const repairUserMessage = [
    'Repair this content into valid JSON object only:',
    '--- BEGIN CONTENT ---',
    raw.slice(0, JSON_REPAIR_MAX_CHARS),
    '--- END CONTENT ---',
  ].join('\n');

  const repaired = await callClaude(repairSystemPrompt, repairUserMessage, 65536);
  console.warn('[pipeline] Repair response preview (first 500 chars):', repaired.text.slice(0, 500));
  return parseClaudeJSON(repaired.text);
}

function extractMissingNatalSections(errors: string[]): string[] {
  const missing = errors
    .filter((e) => e.startsWith('Missing section: '))
    .map((e) => e.replace('Missing section: ', '').trim())
    .filter((e) => SECTION_KEYS.includes(e as (typeof SECTION_KEYS)[number]));
  return Array.from(new Set(missing));
}

async function completeMissingNatalSections(
  partial: Record<string, unknown>,
  userMessage: string,
  language: Language,
  missingSections: string[]
): Promise<Record<string, unknown>> {
  const completionSystemPrompt = [
    'You are a strict JSON section completer for a natal reading schema.',
    'Output exactly one valid JSON object and nothing else.',
    'Include ONLY the missing section keys requested.',
    'Do not include markdown, comments, or prose.',
    'Each returned section must follow the expected section shape.',
    `Target language for section text: ${language}.`,
  ].join(' ');

  const completionUserMessage = [
    'Complete the missing natal reading sections.',
    `Missing section keys: ${missingSections.join(', ')}`,
    'Return JSON object with only these keys.',
    '',
    'Current partial reading JSON:',
    JSON.stringify(partial).slice(0, JSON_REPAIR_MAX_CHARS),
    '',
    'Context for writing missing sections:',
    userMessage.slice(0, JSON_REPAIR_MAX_CHARS),
  ].join('\n');

  const completion = await callClaude(completionSystemPrompt, completionUserMessage, 16000);
  const parsed = await parseOrRepairJSON(completion.text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Section completion returned invalid JSON object');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Tier-1 top-up: ask the model to expand under-filled sections so they meet
 * their card minimums. Sibling of completeMissingNatalSections, but for sections
 * that exist yet are too thin (rather than missing entirely). Returns a JSON
 * object keyed only by the thin sections — each as a FULL replacement section so
 * the caller can spread it over the partial reading.
 */
async function topUpThinNatalSections(
  partial: Record<string, unknown>,
  userMessage: string,
  language: Language,
  thinSections: string[]
): Promise<Record<string, unknown>> {
  const topUpSystemPrompt = [
    'You expand under-filled sections of a natal reading to meet card minimums.',
    'Output exactly one valid JSON object and nothing else.',
    'Include ONLY the section keys requested.',
    'For each, return the COMPLETE section (sectionTitle, sectionTagline, cards[], pullQuote)',
    'with at least the minimum number of cards — keep the existing good cards and add more.',
    'Each card must follow the expected card shape. Do not include markdown, comments, or prose.',
    `Target language for all section text: ${language}.`,
  ].join(' ');

  const minLines = thinSections
    .map((k) => `${k}: at least ${SECTION_MIN_CARDS[k] ?? 4} cards`)
    .join('\n');

  const topUpUserMessage = [
    'Expand these under-filled natal reading sections to meet their card minimums:',
    minLines,
    'Return a JSON object with only these keys, each a full section.',
    '',
    'Current partial reading JSON (preserve its good cards, add more to reach the minimums):',
    JSON.stringify(partial).slice(0, JSON_REPAIR_MAX_CHARS),
    '',
    'Context for writing additional cards:',
    userMessage.slice(0, JSON_REPAIR_MAX_CHARS),
  ].join('\n');

  const completion = await callClaude(topUpSystemPrompt, topUpUserMessage, 16000);
  const parsed = await parseOrRepairJSON(completion.text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Section top-up returned invalid JSON object');
  }
  return parsed as Record<string, unknown>;
}
