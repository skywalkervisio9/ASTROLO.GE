// ============================================================
// Synastry prompts — Couple + Friend variants
// Full prompt text lives in docs/SYSTEM-PROMPT-Couple_s3.md
// and docs/SYSTEM-PROMPT-Friend_s3.md
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
 * Call 1 system prompt — Synastry Analysis (English, internal)
 */
export function getSynastryCall1Prompt(type: 'couple' | 'friend'): string {
  const filename = type === 'couple'
    ? 'SYSTEM-PROMPT-Couple_s3.md'
    : 'SYSTEM-PROMPT-Friend_s3.md';

  const spec = loadPromptFile(filename);
  const partA = extractSection(spec, '## PART A', '## PART B');
  if (partA) return partA;

  // Fallback
  const focus = type === 'couple'
    ? 'romantic compatibility, emotional chemistry, passion dynamics, and intimate potential'
    : 'platonic depth, intellectual resonance, shared values, and mutual growth';

  return `You are an expert synastry analyst. Analyze these two natal charts for ${focus}.

Produce a structured analytical document covering:
1. Relationship narrative arc
2. Cross-chart aspect table (all orb <8°)
3. Nodal axis cross-reference (both directions)
4. Emotional architecture (Moon-Moon, Moon-Sun, Moon-Venus)
5. ${type === 'couple' ? 'Passion & Attraction markers' : 'Intellectual & Values resonance'}
6. Power dynamics (Pluto, Saturn)
7. Growth catalysts (Jupiter, North Node, Chiron)
8. Shadow zones (triggers, projections, loops)
9. Composite indicators
10. Numerology compatibility (Life Path, Expression, Soul Urge)
11. Maximum potential vision

Write in English. Be precise and psychologically insightful.`;
}

/**
 * Call 2 system prompt — Full Synastry Reading (parameterized)
 */
export function getSynastryCall2Prompt(
  type: 'couple' | 'friend',
  language: Language
): string {
  const filename = type === 'couple'
    ? 'SYSTEM-PROMPT-Couple_s3.md'
    : 'SYSTEM-PROMPT-Friend_s3.md';

  const spec = loadPromptFile(filename);

  const partB = extractSection(spec, '## PART B', '## PART C');
  const partD = extractSection(spec, '## PART D', '## PART E');

  // Extract relevant language block from Part C
  const langLabel = language === 'ka' ? 'GEORGIAN' : 'ENGLISH';
  const partC = extractSection(spec, '## PART C', '## PART D');
  const langStart = partC.indexOf(`### ${langLabel}`);
  let langBlock = '';
  if (langStart !== -1) {
    const nextSection = partC.indexOf('###', langStart + 4);
    langBlock = nextSection === -1
      ? partC.slice(langStart)
      : partC.slice(langStart, nextSection);
  }

  if (partB) {
    return `${partB}\n\n${langBlock}\n\n${partD}`;
  }

  // Fallback
  return getSynastryCall2Fallback(type, language);
}

function getSynastryCall2Fallback(type: 'couple' | 'friend', language: Language): string {
  const langInstruction = language === 'ka'
    ? 'Write in Georgian (ქართული). Use native terminology.'
    : 'Write in formal-literary English.';

  const sections = type === 'couple'
    ? 'emotionalBond, passion, karmic, numerology, growth, shadow, dailyRitual, potential'
    : 'emotionalBond, intellectualSynergy, karmic, numerology, growth, shadow, sharedAdventures, potential';

  const wordRange = type === 'couple' ? '5,500-7,500' : '4,500-6,500';

  return `You are a world-class synastry analyst creating a premium ${type} compatibility reading.

${langInstruction}

Output a single JSON object with:
- meta: person1, person2, relationshipType, compatibilityScore, categoryScores, language, generatedAt, promptVersion
- sections: array of objects (${sections}) each with id, title, tagline, icon, iconColor, cards, pullQuote

Word count target: ${wordRange} words.
Every card must cross-reference aspects between both charts.`;
}
