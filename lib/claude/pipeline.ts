// ============================================================
// Two-call Claude pipeline — Natal + Synastry generation
// Call 1: Chart analysis (English, internal)
// Call 2: Full reading (Georgian + English, client-facing)
// ============================================================

import { callClaude } from './client';
import {
  normalizeNatalReadingShape,
  parseClaudeJSON,
  validateNatalReading,
  validateSynastryReading,
} from './validator';
import {
  getNatalCall1Prompt,
  getNatalCall2Prompt,
} from './prompts/natal';
import {
  getSynastryCall1Prompt,
  getSynastryCall2Prompt,
} from './prompts/synastry';
import type { Language } from '@/types/user';
import { SECTION_KEYS } from '@/types/reading';

const MAX_RETRIES = 2;
const JSON_REPAIR_MAX_CHARS = 120000;

// ── Natal reading pipeline ──

export interface NatalPipelineResult {
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

export async function generateNatalReading(
  chartContext: string
): Promise<NatalPipelineResult> {
  // Call 1: Chart Analysis (always English) — plain text output, not JSON
  const call1 = await callClaude(
    getNatalCall1Prompt(),
    `Analyze this natal chart:\n\n${chartContext}`,
    3000,
    false
  );

  // Call 2: Full reading — run KA then EN sequentially to avoid Gemini throttling
  const userMsg = `Chart Analysis:\n${call1.text}\n\nOriginal Chart Data:\n${chartContext}`;

  const readingKa = await generateSingleReading(userMsg, 'ka');
  const readingEn = await generateSingleReading(userMsg, 'en');

  return {
    analysis: call1.text,
    readingKa: readingKa.parsed,
    readingEn: readingEn.parsed,
    meta: {
      modelCall1: call1.model,
      modelCall2: readingKa.model,
      tokensCall1: call1.inputTokens + call1.outputTokens,
      tokensCall2Ka: readingKa.inputTokens + readingKa.outputTokens,
      tokensCall2En: readingEn.inputTokens + readingEn.outputTokens,
      validationWarnings: [...readingKa.warnings, ...readingEn.warnings],
    },
  };
}

async function generateSingleReading(
  userMessage: string,
  language: Language
): Promise<{
  parsed: Record<string, unknown>;
  warnings: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const prompt = getNatalCall2Prompt(language);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callClaude(prompt, userMessage, 65536);
      let parsed = normalizeNatalReadingShape(
        await parseOrRepairJSON(response.text) as Record<string, unknown>
      );
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

      return {
        parsed,
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

export async function generateSynastryReading(
  chart1Context: string,
  chart2Context: string,
  relationshipType: 'couple' | 'friend'
): Promise<SynastryPipelineResult> {
  // Call 1: Synastry Analysis (always English) — plain text output, not JSON
  const call1 = await callClaude(
    getSynastryCall1Prompt(relationshipType),
    `Person 1 Chart:\n${chart1Context}\n\nPerson 2 Chart:\n${chart2Context}`,
    4200,
    false
  );

  // Call 2: Full reading — run KA then EN sequentially to avoid Gemini throttling
  const userMsg = `Synastry Analysis:\n${call1.text}\n\nPerson 1 Chart:\n${chart1Context}\n\nPerson 2 Chart:\n${chart2Context}`;

  const readingKa = await generateSingleSynastryReading(userMsg, 'ka', relationshipType);
  const readingEn = await generateSingleSynastryReading(userMsg, 'en', relationshipType);

  return {
    analysis: call1.text,
    readingKa: readingKa.parsed,
    readingEn: readingEn.parsed,
    meta: {
      modelCall1: call1.model,
      modelCall2: readingKa.model,
      tokensCall1: call1.inputTokens + call1.outputTokens,
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
  const prompt = getSynastryCall2Prompt(relationshipType, language);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callClaude(prompt, userMessage, 65536);
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
