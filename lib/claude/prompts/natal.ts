// ============================================================
// Natal chart prompts — Call 1 (analysis) + Call 2 (reading)
// Full prompt text lives in docs/SYSTEM-PROMPT-8SEC_i4.md
// This file loads and parameterizes them at runtime
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Language } from '@/types/user';

// Load the full prompt spec at module init (server-side only)
let _promptSpec: string | null = null;

function loadPromptSpec(): string {
  if (!_promptSpec) {
    _promptSpec = readFileSync(
      join(process.cwd(), 'docs', 'SYSTEM-PROMPT-8SEC_i4.md'),
      'utf-8'
    );
  }
  return _promptSpec;
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
 * Call 1 system prompt — Chart Analysis (English, internal)
 * Extracts PART A from the prompt specification
 */
export function getNatalCall1Prompt(): string {
  const spec = loadPromptSpec();
  const partA = extractSection(spec, '## PART A', '## PART B');
  if (partA) return partA;

  // Fallback: inline prompt
  return `You are an expert astrologer and depth psychologist. Analyze this natal chart and produce a structured analytical document with these sections:

1. Narrative Arc — 2-3 sentences capturing the soul's central learning theme
2. Nodal Axis Analysis — Evolutionary direction (North Node) + South Node comfort patterns
3. Big Three — Sun (identity), Moon (emotional core), Ascendant (worldly mask)
4. Major Aspects — Top 3 tightest aspects with psychological meaning (orb < 6°)
5. Stelliums & Clusters — Any sign/house with 3+ planets
6. Planetary Dignities — Domicile, exaltation, detriment, fall positions
7. Retrograde Planets — Inner journey markers
8. Cross-Reference Map — How placements interconnect (minimum 3-step chains)
9. Shadow Patterns — 4 primary psychological growth edges
10. Spiritual Gifts — Natural talents and intuitive abilities
11. Career Signatures — Top ranked vocational indicators
12. Relationship Signatures — Venus/Mars/7th house/Juno/attachment style
13. Special Degrees — Anaretic (29°) and critical degrees

Write in English. Be analytical, precise, and psychologically insightful. Output plain text, not JSON.`;
}

/**
 * Call 2 system prompt — Full Reading (parameterized by language)
 * Extracts PART B + relevant language block from the prompt specification
 */
export function getNatalCall2Prompt(language: Language): string {
  const spec = loadPromptSpec();

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

  // Fallback inline
  return getCall2FallbackPrompt(language);
}

function getCall2FallbackPrompt(language: Language): string {
  const langInstruction = language === 'ka'
    ? 'Write the entire reading in Georgian (ქართული). Use native Georgian astrological terminology. Never transliterate English into Georgian script.'
    : 'Write in formal-literary English with an elevated, philosophical tone.';

  return `You are a world-class astrologer creating a premium natal chart reading.

${langInstruction}

Output a single JSON object with these 8 sections: overview, mission, characteristics, relationships, work, shadow, spiritual, potential.

Each section has: sectionTitle, sectionTagline, cards (array), pullQuote.
Each card has: id, label, title, body (array of paragraphs), crossReferences (array), expandedContent (array or null), hint (object with title, content, bullets), accentElement.

Include a meta object with: name, birthData, sunSign, moonSign, risingSign, language ("${language}"), generatedAt, promptVersion.

Word count target: 7,500-9,500 words total.
Minimum cards per section: overview 3, mission 4, characteristics 4, relationships 4, work 4, shadow 4, spiritual 4, potential 2.
Every card must cross-reference at least 2 other placements showing 3+ step chains.`;
}
