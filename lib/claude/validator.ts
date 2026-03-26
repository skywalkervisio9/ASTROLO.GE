// ============================================================
// Claude output validation — parse JSON + validate structure
// ============================================================

import { SECTION_KEYS } from '@/types/reading';

/**
 * Strip markdown code fences and parse JSON from Claude's response
 */
export function parseClaudeJSON(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Validate a natal reading has all required sections and minimum cards
 */
export function validateNatalReading(json: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check all 8 sections present
  for (const key of SECTION_KEYS) {
    if (!json[key]) errors.push(`Missing section: ${key}`);
  }

  // Check meta
  const meta = json.meta as Record<string, unknown> | undefined;
  if (meta && !['ka', 'en'].includes(meta.language as string)) {
    errors.push('Invalid language in meta');
  }

  // Check minimum card counts
  const minCards: Record<string, number> = {
    overview: 3, mission: 4, characteristics: 4, relationships: 4,
    work: 4, shadow: 4, spiritual: 4, potential: 2,
  };

  for (const key of SECTION_KEYS) {
    const section = json[key] as Record<string, unknown> | undefined;
    if (!section) continue;
    const cards = (section.cards ?? section.coreCards) as unknown[] | undefined;
    const count = cards?.length ?? 0;
    const min = minCards[key] ?? 0;
    if (count < min) {
      warnings.push(`${key}: ${count} cards (min ${min})`);
    }
  }

  // Estimate word count
  const totalText = JSON.stringify(json);
  const wordEstimate = totalText.split(/\s+/).length;
  if (wordEstimate < 5000) {
    warnings.push(`Low word count estimate: ~${wordEstimate} (target 7500-9500)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a synastry reading (couple or friend)
 */
export function validateSynastryReading(
  json: Record<string, unknown>,
  type: 'couple' | 'friend'
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!json.meta) errors.push('Missing meta');
  if (!json.sections) errors.push('Missing sections');

  const sections = json.sections as unknown[] | undefined;
  const expectedCount = type === 'couple' ? 8 : 8;
  if (sections && sections.length < expectedCount) {
    warnings.push(`Expected ${expectedCount} sections, got ${sections.length}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
