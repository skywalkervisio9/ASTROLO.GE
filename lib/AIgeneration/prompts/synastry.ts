// ============================================================
// Synastry prompts — Couple + Friend variants (s4: no Call 1)
// Full prompt text lives in docs/SYSTEM-PROMPT-Couple_s4.md
// and docs/SYSTEM-PROMPT-Friend_s4.md
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Language } from '@/types/user';

// Cache loaded prompts
const _cache: Record<string, string> = {};

function loadPromptFile(filename: string): string {
  if (!_cache[filename]) {
    _cache[filename] = readFileSync(
      join(process.cwd(), 'docs', filename),
      'utf-8'
    );
  }
  return _cache[filename];
}

/** Extract text between two markdown headings */
function extractSection(text: string, startHeading: string, endHeading: string): string {
  const startIdx = text.indexOf(startHeading);
  if (startIdx === -1) return '';
  const endIdx = endHeading ? text.indexOf(endHeading, startIdx + startHeading.length) : -1;
  return endIdx === -1
    ? text.slice(startIdx)
    : text.slice(startIdx, endIdx);
}

/**
 * System prompt for synastry reading (s4: single call, no Call 1)
 * Uses natal analyses from both users as input context.
 */
export function getSynastryPrompt(
  type: 'couple' | 'friend',
  language: Language
): string {
  const filename = type === 'couple'
    ? 'SYSTEM-PROMPT-Couple_s4.md'
    : 'SYSTEM-PROMPT-Friend_s4.md';

  const spec = loadPromptFile(filename);

  // Extract system prompt body (between ``` fences in PART B)
  const partB = extractSection(spec, '## SYSTEM PROMPT:', '# PART C');
  const partD = extractSection(spec, '# PART D', '# PART E');

  // Extract relevant language block from Part C
  const langLabel = language === 'ka' ? 'GEORGIAN' : 'ENGLISH';
  const partC = extractSection(spec, '# PART C', '# PART D');
  const langStart = partC.indexOf(`## ${langLabel}:`);
  let langBlock = '';
  if (langStart !== -1) {
    const nextSection = partC.indexOf('##', langStart + 4);
    langBlock = nextSection === -1
      ? partC.slice(langStart)
      : partC.slice(langStart, nextSection);
  }

  if (partB) {
    // Extract just the content between ``` fences in the system prompt block
    const fenceMatch = partB.match(/```\n?([\s\S]*?)```/);
    let promptBody = fenceMatch ? fenceMatch[1].trim() : partB;

    // Extract language block content from ``` fences
    const langFenceMatch = langBlock.match(/```\n?([\s\S]*?)```/);
    const langBody = langFenceMatch ? langFenceMatch[1].trim() : langBlock;

    // Replace {LANGUAGE_BLOCK} placeholder if present, otherwise append
    if (promptBody.includes('{LANGUAGE_BLOCK}')) {
      promptBody = promptBody.replace('{LANGUAGE_BLOCK}', langBody);
    } else {
      promptBody = `${promptBody}\n\n${langBody}`;
    }

    return `${promptBody}\n\n${partD}`;
  }

  // Fallback
  return getSynastryFallback(type, language);
}

/**
 * Build the user message for synastry generation.
 * Combines both users' natal analyses + chart contexts.
 */
export function buildSynastryUserMessage(
  personAName: string,
  personAAnalysis: string,
  personAChartContext: string,
  personBName: string,
  personBAnalysis: string,
  personBChartContext: string,
  type: 'couple' | 'friend'
): string {
  const typeLabel = type === 'couple' ? 'couple' : 'friendship';
  return [
    `PERSON A — ${personAName}:`,
    'Natal Analysis:',
    personAAnalysis,
    '',
    'Chart Data:',
    personAChartContext,
    '',
    `PERSON B — ${personBName}:`,
    'Natal Analysis:',
    personBAnalysis,
    '',
    'Chart Data:',
    personBChartContext,
    '',
    `Generate the complete 8-section ${typeLabel} synastry reading as a single JSON object.`,
    'Return ONLY JSON.',
  ].join('\n');
}

// ── Legacy exports for backward compatibility (kept for seed route) ──

/** @deprecated Use getSynastryPrompt() instead — s4 has no Call 1 */
export function getSynastryCall1Prompt(type: 'couple' | 'friend'): string {
  // Return a minimal prompt for any code still calling this
  const focus = type === 'couple'
    ? 'romantic compatibility, emotional chemistry, passion dynamics, and intimate potential'
    : 'platonic depth, intellectual resonance, shared values, and mutual growth';

  return `You are an expert synastry analyst. Analyze these two natal charts for ${focus}.
Produce a structured analytical document. Write in English. Be precise and psychologically insightful.`;
}

/** @deprecated Use getSynastryPrompt() instead */
export function getSynastryCall2Prompt(
  type: 'couple' | 'friend',
  language: Language
): string {
  return getSynastryPrompt(type, language);
}

function getSynastryFallback(type: 'couple' | 'friend', language: Language): string {
  const langInstruction = language === 'ka'
    ? 'Write in Georgian (ქართული). Use native terminology.'
    : 'Write in formal-literary English.';

  const sections = type === 'couple'
    ? 'emotionalBond, passion, karmic, numerology, growth, shadow, dailyRitual, potential'
    : 'emotionalBond, intellectualSynergy, karmic, numerology, growth, shadow, sharedAdventures, potential';

  const wordRange = type === 'couple' ? '5,500-7,500' : '4,500-6,500';

  return `You are a world-class synastry analyst creating a premium ${type} compatibility reading.

You receive two partners' individual natal analyses and their chart data. Cross-reference both charts to find inter-chart aspects and generate the reading.

${langInstruction}

Output a single JSON object with:
- meta: personA, personB, type, compatibilityScore, categoryScores, language
- 8 section keys (${sections}) each with sectionTitle, sectionSubtitle, cards, pullQuote

Word count target: ${wordRange} words.
Every card must cross-reference aspects between both charts.`;
}
