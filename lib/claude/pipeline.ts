// ============================================================
// Two-call Claude pipeline — Natal + Synastry generation
// Call 1: Chart analysis (English, internal)
// Call 2: Full reading (Georgian + English, client-facing)
// ============================================================

import { callClaude, type ClaudeResponse } from './client';
import { parseClaudeJSON, validateNatalReading, validateSynastryReading } from './validator';
import {
  getNatalCall1Prompt,
  getNatalCall2Prompt,
} from './prompts/natal';
import {
  getSynastryCall1Prompt,
  getSynastryCall2Prompt,
} from './prompts/synastry';
import type { Language } from '@/types/user';

const MAX_RETRIES = 2;

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
  // Call 1: Chart Analysis (always English)
  const call1 = await callClaude(
    getNatalCall1Prompt(),
    `Analyze this natal chart:\n\n${chartContext}`,
    3000
  );

  // Call 2: Full reading — run KA and EN in parallel
  const userMsg = `Chart Analysis:\n${call1.text}\n\nOriginal Chart Data:\n${chartContext}`;

  const [readingKa, readingEn] = await Promise.all([
    generateSingleReading(userMsg, 'ka'),
    generateSingleReading(userMsg, 'en'),
  ]);

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
      const response = await callClaude(prompt, userMessage, 8192);
      const parsed = parseClaudeJSON(response.text) as Record<string, unknown>;
      const validation = validateNatalReading(parsed);

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
  // Call 1: Synastry Analysis (always English)
  const call1 = await callClaude(
    getSynastryCall1Prompt(relationshipType),
    `Person 1 Chart:\n${chart1Context}\n\nPerson 2 Chart:\n${chart2Context}`,
    4200
  );

  // Call 2: Full reading — KA and EN in parallel
  const userMsg = `Synastry Analysis:\n${call1.text}\n\nPerson 1 Chart:\n${chart1Context}\n\nPerson 2 Chart:\n${chart2Context}`;

  const [readingKa, readingEn] = await Promise.all([
    generateSingleSynastryReading(userMsg, 'ka', relationshipType),
    generateSingleSynastryReading(userMsg, 'en', relationshipType),
  ]);

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
      const response = await callClaude(prompt, userMessage, 8192);
      const parsed = parseClaudeJSON(response.text) as Record<string, unknown>;
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
