// ============================================================
// AI output validation — parse JSON + validate structure
// ============================================================

import { SECTION_KEYS } from '@/types/reading';

/**
 * Strip markdown code fences and parse JSON from AI response
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

/**
 * Split inline numbered lists into separate array elements.
 * Catches patterns like: "intro: 1) **Title**: body, 2) **Title**: body"
 * and converts them to: ["intro:", "1. **Title**: body", "2. **Title**: body"]
 */
function splitInlineLists(paragraphs: string[]): string[] {
  const result: string[] = [];
  for (const p of paragraphs) {
    if (typeof p !== 'string') { result.push(p); continue; }

    // Detect inline numbered list with PARENTHESIS format: "1) ... 2) ..."
    const hasParenList = /\b1\)\s/.test(p) && /\b2\)\s/.test(p);
    // Detect inline numbered list with PERIOD format: "1. ... 2. ..." (both in ONE string)
    const hasPeriodList = /\b1\.\s/.test(p) && /\b2\.\s/.test(p) && !/^\s*1\.\s/.test(p);

    if (hasParenList) {
      const parts = p.split(/\s*\b(\d+)\)\s+/);
      const intro = parts[0].replace(/:\s*$/, '').trim();
      if (intro) result.push(intro);
      for (let i = 1; i < parts.length; i += 2) {
        const num = parts[i];
        let item = (parts[i + 1] || '').trim();
        if (i + 2 < parts.length - 1) item = item.replace(/[,;]\s*$/, '').trim();
        if (item) result.push(`${num}. ${item}`);
      }
    } else if (hasPeriodList) {
      // Split on " 1. " " 2. " etc. — but only when mid-string (not at start)
      const parts = p.split(/\s+(\d+)\.\s+/);
      const intro = parts[0].replace(/:\s*$/, '').trim();
      if (intro) result.push(intro);
      for (let i = 1; i < parts.length; i += 2) {
        const num = parts[i];
        let item = (parts[i + 1] || '').trim();
        if (i + 2 < parts.length - 1) item = item.replace(/[,;]\s*$/, '').trim();
        if (item) result.push(`${num}. ${item}`);
      }
    } else {
      result.push(p);
    }
  }
  return result;
}

/**
 * Number consecutive **Title:** body items that follow a section header.
 * Catches patterns like: ["**Header:**", "**A:** body", "**B:** body"]
 * and converts to: ["**Header:**", "1. **A:** body", "2. **B:** body"]
 * Only triggers when 2+ consecutive bold-colon items appear after a standalone header.
 */
function numberBoldColonItems(paragraphs: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    // Detect standalone section header: "**Title:**" (bold, ends with colon, no body after colon)
    const isHeader = typeof p === 'string' && /^\*\*[^*]+\*\*:?\s*$/.test(p.trim());
    if (isHeader) {
      // Look ahead for consecutive "**Title:** body" items (bold title with colon AND body text after)
      const items: string[] = [];
      let j = i + 1;
      while (j < paragraphs.length) {
        const next = paragraphs[j];
        if (typeof next === 'string' && /^\*\*[^*]+:\*\*\s*.+/.test(next.trim())) {
          items.push(next);
          j++;
        } else if (typeof next === 'string' && /^\*\*[^*]+\*\*:\s*.+/.test(next.trim())) {
          items.push(next);
          j++;
        } else {
          break;
        }
      }
      if (items.length >= 2) {
        // Header + 2+ items → number them
        result.push(p);
        items.forEach((item, idx) => {
          // Skip if already numbered
          if (/^\d+\.\s/.test(item.trim())) {
            result.push(item);
          } else {
            result.push(`${idx + 1}. ${item}`);
          }
        });
        i = j;
      } else {
        result.push(p);
        i++;
      }
    } else {
      result.push(p);
      i++;
    }
  }
  return result;
}

/** Replace verbose English terms with standard abbreviations (i12) */
function sanitizeTerminology(p: string): string {
  if (typeof p !== 'string') return p;
  return p
    .replace(/\bAscendant\b/gi, 'ASC')
    .replace(/\bDescendant\b/gi, 'DSC')
    .replace(/\bMidheaven\b/gi, 'MC')
    .replace(/\bასცენდენტი/g, 'ASC')
    .replace(/\bდესცენდენტი/g, 'DSC');
}

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
    // Normalize terminology: Ascendant/Descendant/Midheaven → ASC/DSC/MC (i12)
    c.body = (c.body as string[]).map(sanitizeTerminology);
    if (Array.isArray(c.expandedContent)) {
      // expandedContent: sanitize terms + split inline lists + number bold-colon items
      c.expandedContent = numberBoldColonItems(
        splitInlineLists((c.expandedContent as string[]).map(sanitizeTerminology))
      );
    }
    // Drop legacy bullets from hint (removed in i10 — content is prose now)
    if (c.hint && typeof c.hint === 'object') {
      const h = c.hint as Record<string, unknown>;
      delete h.bullets;
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
  // Drop meta — all that data lives in Supabase (i10+)
  delete json.meta;
  const sections = Array.isArray(json.sections) ? (json.sections as Array<Record<string, unknown>>) : [];

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
        // planetTable + aspects injected by route from chart_data — not from AI output
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
