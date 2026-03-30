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

  // Fast path: fully valid JSON response.
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with extraction heuristics below.
  }

  // Common case: model adds pre/post text around JSON.
  const extracted = extractFirstJSONObject(cleaned);
  if (extracted) {
    return JSON.parse(extracted);
  }

  throw new SyntaxError('Model response did not contain parseable JSON');
}

// Map Georgian (and other variant) element names to canonical English keys
const ELEMENT_NORMALIZE: Record<string, string> = {
  fire: 'fire', earth: 'earth', air: 'air', water: 'water',
  // Georgian
  'ცეცხლი': 'fire', 'მიწა': 'earth', 'ჰაერი': 'air', 'წყალი': 'water',
  // Common variants
  'Fire': 'fire', 'Earth': 'earth', 'Air': 'air', 'Water': 'water',
};

/** Normalize accentElement on all cards in a section */
function normalizeCards(cards: unknown[]): unknown[] {
  return cards.map((card) => {
    if (!card || typeof card !== 'object') return card;
    const c = card as Record<string, unknown>;
    // Coerce body to string array
    if (typeof c.body === 'string') c.body = [c.body];
    else if (!Array.isArray(c.body)) c.body = [];
    // Coerce expandedContent to string array
    if (typeof c.expandedContent === 'string') c.expandedContent = [c.expandedContent];
    else if (c.expandedContent && !Array.isArray(c.expandedContent)) c.expandedContent = [];
    // Coerce hint.bullets to string array
    if (c.hint && typeof c.hint === 'object') {
      const h = c.hint as Record<string, unknown>;
      if (typeof h.bullets === 'string') h.bullets = [h.bullets];
      else if (h.bullets && !Array.isArray(h.bullets)) h.bullets = [];
    }
    // Coerce crossReferences to string array
    if (!Array.isArray(c.crossReferences)) c.crossReferences = [];
    // Normalize accentElement
    if (c.accentElement && typeof c.accentElement === 'string') {
      c.accentElement = ELEMENT_NORMALIZE[c.accentElement] ?? c.accentElement.toLowerCase();
    }
    return c;
  });
}

export function normalizeNatalReadingShape(input: Record<string, unknown>): Record<string, unknown> {
  const json: Record<string, unknown> = { ...input };
  const sections = Array.isArray(json.sections) ? (json.sections as Array<Record<string, unknown>>) : [];

  // Normalize meta.language
  const meta = json.meta as Record<string, unknown> | undefined;
  if (meta) {
    const lang = String(meta.language || '').toLowerCase().trim();
    meta.language = lang === 'en' ? 'en' : 'ka';
  }

  // Normalize accentElement on top-level sections that already exist
  for (const key of SECTION_KEYS) {
    const section = json[key] as Record<string, unknown> | undefined;
    if (!section) continue;
    if (Array.isArray(section.cards)) section.cards = normalizeCards(section.cards);
    if (Array.isArray(section.coreCards)) section.coreCards = normalizeCards(section.coreCards);
  }

  if (sections.length === 0) return json;

  const sectionMap: Record<string, string> = {
    overview: 'overview',
    mission: 'mission',
    mission_karmic_path: 'mission',
    missionandkarmicpath: 'mission',
    characteristics: 'characteristics',
    personality: 'characteristics',
    relationships: 'relationships',
    relationship: 'relationships',
    work: 'work',
    career: 'work',
    shadow: 'shadow',
    spiritual: 'spiritual',
    spirituality: 'spiritual',
    potential: 'potential',
  };

  const normalizeKey = (value: unknown) =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  for (const section of sections) {
    const rawId = section.id ?? section.key ?? section.slug ?? section.sectionKey ?? section.title;
    const mapped = sectionMap[normalizeKey(rawId)];
    if (!mapped) continue;

    if (mapped === 'overview') {
      const overviewCards = Array.isArray(section.cards) ? section.cards : (Array.isArray(section.coreCards) ? section.coreCards : []);
      json.overview = {
        sectionTitle: section.sectionTitle ?? section.title ?? '',
        sectionTagline: section.sectionTagline ?? section.tagline ?? '',
        planetTable: Array.isArray(section.planetTable) ? section.planetTable : [],
        aspects: Array.isArray(section.aspects) ? section.aspects : [],
        coreCards: normalizeCards(overviewCards as unknown[]),
        pullQuote: section.pullQuote ?? null,
      };
      continue;
    }

    json[mapped] = {
      sectionTitle: section.sectionTitle ?? section.title ?? '',
      sectionTagline: section.sectionTagline ?? section.tagline ?? '',
      cards: normalizeCards(Array.isArray(section.cards) ? section.cards as unknown[] : []),
      pullQuote: section.pullQuote ?? null,
    };
  }

  return json;
}

function extractFirstJSONObject(input: string): string | null {
  const start = input.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
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

  const normalized = normalizeNatalReadingShape(json);

  // Check all 8 sections present
  for (const key of SECTION_KEYS) {
    if (!normalized[key]) errors.push(`Missing section: ${key}`);
  }

  // Check meta
  const meta = normalized.meta as Record<string, unknown> | undefined;
  if (meta && !['ka', 'en'].includes(meta.language as string)) {
    errors.push('Invalid language in meta');
  }

  // Check minimum card counts
  const minCards: Record<string, number> = {
    overview: 3, mission: 4, characteristics: 4, relationships: 4,
    work: 4, shadow: 4, spiritual: 4, potential: 2,
  };

  for (const key of SECTION_KEYS) {
    const section = normalized[key] as Record<string, unknown> | undefined;
    if (!section) continue;
    const cards = (section.cards ?? section.coreCards) as unknown[] | undefined;
    const count = cards?.length ?? 0;
    const min = minCards[key] ?? 0;
    if (count < min) {
      warnings.push(`${key}: ${count} cards (min ${min})`);
    }
  }

  // Estimate word count
  const totalText = JSON.stringify(normalized);
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
