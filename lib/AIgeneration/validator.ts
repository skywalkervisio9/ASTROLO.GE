// ============================================================
// AI output validation — parse JSON + validate structure
// ============================================================

import { SECTION_KEYS } from '@/types/reading';

// Minimum card count per section. Used both by validateNatalReading (as a
// soft warning) and by assessNatalReadingQuality (Tier-1 quality floor) to
// decide which sections need topping up.
export const SECTION_MIN_CARDS: Record<string, number> = {
  overview: 3, mission: 4, characteristics: 4, relationships: 4,
  work: 4, shadow: 4, spiritual: 4, potential: 2,
};

// ── Tier-1 quality floor (balanced) ──
// A reading can be structurally valid (all 8 section keys present) yet hollow
// — e.g. bogpremium's Georgian Call 2 came back at ~15 cards / ~2,276 words
// while a healthy reading is ~28 cards / ~5,000 words. These thresholds reject
// only the grossly-short outputs; lightly-short "marginal" readings pass.
export const MIN_TOTAL_CARDS = 18;
export const MIN_WORD_ESTIMATE = 3500;
// One language must be at least this fraction of the other's card count.
// Catches the lopsided case (full EN, skeletal KA) even when the smaller side
// scrapes just past the absolute floor.
export const PARITY_MIN_RATIO = 0.6;

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

// Georgian case suffixes attached to chart-point words. Ordered longest-first so
// the regex prefers სთვის over თვის, ისთვის over სთვის, etc.
const KA_PT_SUFFIX_RE_SRC = '(ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|მან|მა|ის|ს|ო|ია|ა|ი)';

// Stems for ASC/DSC/MC/IC in Georgian. The "ცის " prefix on MC/IC stays fixed —
// only the head word inflects. Stems intentionally exclude the final ი of the
// nominative so we can re-attach it (or substitute another suffix) consistently.
const KA_PT_STEM_TO_ABBR: Record<string, 'ASC' | 'DSC' | 'MC' | 'IC'> = {
  'ასცენდენტ': 'ASC',
  'დესცენდენტ': 'DSC',
  'ცის შუაწერტილ': 'MC',
  'ცის ფსკერ': 'IC',
};

// ── Planet suffix validator (mirrors the chart-point sanitizer for zodiac-like
// planet handling). Any inflected Georgian planet word → canonical "symbol" or
// "symbol-suffix" so the renderer's icon/name toggle owns the display. Node
// forms carry a fixed genitive prefix; bare "კვანძი" defaults to North Node. ──
const KA_PLANET_DECL: Array<{ sym: string; forms: Record<string, string> }> = [
  { sym:'☉', forms:{nom:'მზე',gen:'მზის',loc:'მზეში',dat:'მზეს',inst:'მზით',adv:'მზედ',for:'მზისთვის',with:'მზესთან',voc:'მზეო'} },
  { sym:'☽', forms:{nom:'მთვარე',gen:'მთვარის',loc:'მთვარეში',dat:'მთვარეს',inst:'მთვარით',adv:'მთვარედ',for:'მთვარისთვის',with:'მთვარესთან',voc:'მთვარეო'} },
  { sym:'☿', forms:{nom:'მერკური',gen:'მერკურის',loc:'მერკურში',dat:'მერკურს',inst:'მერკურით',adv:'მერკურად',for:'მერკურისთვის',with:'მერკურთან',voc:'მერკურო'} },
  { sym:'♀', forms:{nom:'ვენერა',gen:'ვენერას',loc:'ვენერაში',dat:'ვენერას',inst:'ვენერათი',adv:'ვენერად',for:'ვენერასთვის',with:'ვენერასთან',voc:'ვენერავ'} },
  { sym:'♂', forms:{nom:'მარსი',gen:'მარსის',loc:'მარსში',dat:'მარსს',inst:'მარსით',adv:'მარსად',for:'მარსისთვის',with:'მარსთან',voc:'მარსო'} },
  { sym:'♃', forms:{nom:'იუპიტერი',gen:'იუპიტერის',loc:'იუპიტერში',dat:'იუპიტერს',inst:'იუპიტერით',adv:'იუპიტერად',for:'იუპიტერისთვის',with:'იუპიტერთან',voc:'იუპიტერო'} },
  { sym:'♄', forms:{nom:'სატურნი',gen:'სატურნის',loc:'სატურნში',dat:'სატურნს',inst:'სატურნით',adv:'სატურნად',for:'სატურნისთვის',with:'სატურნთან',voc:'სატურნო'} },
  { sym:'♅', forms:{nom:'ურანი',gen:'ურანის',loc:'ურანში',dat:'ურანს',inst:'ურანით',adv:'ურანად',for:'ურანისთვის',with:'ურანთან',voc:'ურანო'} },
  { sym:'♆', forms:{nom:'ნეპტუნი',gen:'ნეპტუნის',loc:'ნეპტუნში',dat:'ნეპტუნს',inst:'ნეპტუნით',adv:'ნეპტუნად',for:'ნეპტუნისთვის',with:'ნეპტუნთან',voc:'ნეპტუნო'} },
  { sym:'♇', forms:{nom:'პლუტონი',gen:'პლუტონის',loc:'პლუტონში',dat:'პლუტონს',inst:'პლუტონით',adv:'პლუტონად',for:'პლუტონისთვის',with:'პლუტონთან',voc:'პლუტონო'} },
  { sym:'⚸', forms:{nom:'ლილითი',gen:'ლილითის',loc:'ლილითში',dat:'ლილითს',inst:'ლილითით',adv:'ლილითად',for:'ლილითისთვის',with:'ლილითთან',voc:'ლილითო'} },
  { sym:'⚷', forms:{nom:'ქირონი',gen:'ქირონის',loc:'ქირონში',dat:'ქირონს',inst:'ქირონით',adv:'ქირონად',for:'ქირონისთვის',with:'ქირონთან',voc:'ქირონო'} },
  { sym:'☊', forms:{nom:'ჩრდილოეთის კვანძი',gen:'ჩრდილოეთის კვანძის',loc:'ჩრდილოეთის კვანძში',dat:'ჩრდილოეთის კვანძს',inst:'ჩრდილოეთის კვანძით',for:'ჩრდილოეთის კვანძისთვის',with:'ჩრდილოეთის კვანძთან'} },
  { sym:'☋', forms:{nom:'სამხრეთის კვანძი',gen:'სამხრეთის კვანძის',loc:'სამხრეთის კვანძში',dat:'სამხრეთის კვანძს',inst:'სამხრეთის კვანძით',for:'სამხრეთის კვანძისთვის',with:'სამხრეთის კვანძთან'} },
  // Bare "კვანძი" (no prefix) → North Node.
  { sym:'☊', forms:{nom:'კვანძი',gen:'კვანძის',loc:'კვანძში',dat:'კვანძს',inst:'კვანძით',for:'კვანძისთვის',with:'კვანძთან'} },
];
// case → canonical hyphen suffix emitted after the symbol (nom = bare symbol).
const KA_PLANET_CASE_SUFFIX: Record<string, string> = {
  nom:'', gen:'ის', loc:'ში', dat:'ს', inst:'ით', adv:'ად', for:'ისთვის', with:'თან', voc:'ო',
};
// word → "symbol" | "symbol-suffix". Longest words first so oblique forms win
// over the nominative prefix (e.g. მზისთვის before მზის before მზ…).
const KA_PLANET_WORD_TO_TOKEN: Array<[string, string]> = (() => {
  const pairs: Array<[string, string]> = [];
  for (const { sym, forms } of KA_PLANET_DECL) {
    for (const [c, word] of Object.entries(forms)) {
      const suf = KA_PLANET_CASE_SUFFIX[c];
      pairs.push([word, suf ? `${sym}-${suf}` : sym]);
    }
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
})();
const KA_PLANET_WORD_RE = new RegExp(
  '(?<![ა-ჰ])(' + KA_PLANET_WORD_TO_TOKEN.map(([w]) => w).join('|') + ')(?![ა-ჰ])',
  'g'
);
const KA_PLANET_WORD_MAP = new Map(KA_PLANET_WORD_TO_TOKEN);
// Any planet symbol, optionally already carrying a "-suffix".
const PLANET_SYM_CLASS = '[☉☽☿♀♂♃♄♅♆♇⚸☊☋⚷]';
const PLANET_SUFFIX_ALT = 'ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|ის|ს|ო|ია|ა';

function sanitizePlanetTerminology(p: string): string {
  if (typeof p !== 'string') return p;
  // 0. The Latin word "Chiron" — the only planet whose glyph (⚷) the prompt used
  //    to omit from its keep-symbols list, so the model wrote it out as a word
  //    (in Georgian readings too). Fold it to the glyph, keeping any Georgian case
  //    suffix so the renderer's icon/name toggle can re-inflect it.
  let t = p.replace(
    new RegExp(`\\bChiron\\b(?:-?(${PLANET_SUFFIX_ALT}))?`, 'gi'),
    (_m, suf) => (suf ? `⚷-${suf}` : '⚷')
  );
  // 1. Inflected planet words → canonical symbol(-suffix).
  t = t.replace(KA_PLANET_WORD_RE, (w) => KA_PLANET_WORD_MAP.get(w) ?? w);
  // 2. Collapse a symbol immediately followed by the same symbol — the old
  //    "☉ მზე" pairing becomes "☉ ☉" after step 1. Keep the second token's
  //    suffix if it has one (the word carried the case), else keep the first.
  t = t.replace(
    new RegExp(`(${PLANET_SYM_CLASS})(?:-(?:${PLANET_SUFFIX_ALT}))?\\s*(\\1(?:-(?:${PLANET_SUFFIX_ALT}))?)`, 'g'),
    (_full, _first, second) => second
  );
  return t;
}

// Defensive: "H1".."H12" house notation → Roman numerals (spec mandates Roman
// houses; catches AI slips at generation time — the renderer does the same at
// display time for already-stored readings). "\b" anchors keep "H2O" untouched.
const HOUSE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function normalizeHouseNotation(p: string): string {
  if (typeof p !== 'string') return p;
  return p.replace(/\bH(1[0-2]|[1-9])\b/g, (_m, n) => HOUSE_ROMAN[+n]);
}

// Numeric orb tucked in a parenthetical, e.g. „(2°06' ორბით)" / „(orb 2°06')" /
// „(0.62° ორბი)". The i14 prompt bans these in prose (aspect strength is conveyed
// in words; the numeric orb already renders in the aspect table) but the AI still
// slips them in, and older cached readings carry them — so strip at generation
// AND at display time (see ORB_PAREN_RE use in renderText.tsx / app-runtime.js).
// Both lookaheads must hold — a degree AND the orb keyword — so a plain degree
// parenthetical like „(11°25')" is left untouched.
const ORB_PAREN_RE = /\s*\((?=[^)]*[°º])(?=[^)]*(?:ორბ|orb))[^)]*\)/giu;

/** Replace verbose English terms with standard abbreviations (i12) */
function sanitizeTerminology(p: string): string {
  if (typeof p !== 'string') return p;
  let t = p
    .replace(ORB_PAREN_RE, '')
    .replace(/\bAscendant\b/gi, 'ASC')
    .replace(/\bDescendant\b/gi, 'DSC')
    .replace(/\bMidheaven\b/gi, 'MC')
    .replace(/\bImum Coeli\b/gi, 'IC');

  // Georgian chart-point words: catch all inflected forms — with or without an
  // explicit hyphen between stem and case marker — and rewrite to ABBR
  // (nominative) or ABBR-suffix (oblique). The AI sometimes writes
  // "ასცენდენტი-მან" or "ცის ფსკერი-ის" with literal hyphens; without this
  // normalization those would render as "ასცენდენტი-მან" in name mode (wrong:
  // should be "ასცენდენტმა"). The renderer re-inflects the canonical form back
  // into grammatical Georgian when the user has the name-display mode on.
  const stemPattern = '(ცის\\s+შუა\\s*წერტილ|ცის\\s+ფსკერ|ასცენდენტ|დესცენდენტ)';
  t = t.replace(
    new RegExp(stemPattern + '-?' + KA_PT_SUFFIX_RE_SRC + '?', 'g'),
    (_full, rawStem, suffix) => {
      const stem = String(rawStem).replace(/\s+/g, ' ').replace('ცის შუა წერტილ', 'ცის შუაწერტილ');
      const abbr = KA_PT_STEM_TO_ABBR[stem];
      if (!abbr) return _full;
      if (!suffix || suffix === 'ი') return abbr;
      return `${abbr}-${suffix}`;
    }
  );

  // Collapse ABBR-ი (nominative-with-dash, e.g. "ASC-ი") back to bare ABBR.
  t = t.replace(/\b(ASC|MC|IC|DSC)-ი\b/g, '$1');

  return t;
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
    // Normalize terminology: chart points (Ascendant→ASC, i12) + planet words
    // (მზის→☉-ის) so the renderer's icon/name toggle owns every planet.
    const sanitizeText = (s: string) => normalizeHouseNotation(sanitizePlanetTerminology(sanitizeTerminology(s)));
    c.body = (c.body as string[]).map(sanitizeText);
    if (Array.isArray(c.expandedContent)) {
      // expandedContent: sanitize terms + split inline lists + number bold-colon items
      c.expandedContent = numberBoldColonItems(
        splitInlineLists((c.expandedContent as string[]).map(sanitizeText))
      );
    }
    // Label + crossReferences carry the same planet symbols/words as the badge.
    if (typeof c.label === 'string') c.label = sanitizeText(c.label);
    if (Array.isArray(c.crossReferences)) c.crossReferences = (c.crossReferences as unknown[]).map((r) => (typeof r === 'string' ? sanitizeText(r) : r));
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

  // Check minimum card counts (soft — warnings only; the hard quality gate
  // lives in assessNatalReadingQuality)
  for (const key of SECTION_KEYS) {
    const section = normalized[key] as Record<string, unknown> | undefined;
    if (!section) continue;
    const cards = (section.cards ?? section.coreCards) as unknown[] | undefined;
    const count = cards?.length ?? 0;
    const min = SECTION_MIN_CARDS[key] ?? 0;
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

export interface ReadingQuality {
  totalCards: number;       // cards summed across all 8 sections
  wordEstimate: number;     // whitespace-split count of the JSON (same metric as the validator warning)
  thinSections: string[];   // sections below their per-section min — targets for top-up
  tooThin: boolean;         // fails the balanced absolute floor
}

function sectionCardCount(section: unknown): number {
  if (!section || typeof section !== 'object') return 0;
  const s = section as Record<string, unknown>;
  const cards = (s.coreCards ?? s.cards) as unknown[] | undefined;
  return Array.isArray(cards) ? cards.length : 0;
}

/**
 * Tier-1 quality floor. Distinct from validateNatalReading (which checks
 * STRUCTURE — are all section keys present). This measures CONTENT VOLUME so a
 * structurally-valid-but-hollow reading doesn't ship silently.
 *
 * Expects an already-normalized reading (top-level section keys present).
 */
export function assessNatalReadingQuality(json: Record<string, unknown>): ReadingQuality {
  const normalized = normalizeNatalReadingShape(json);

  let totalCards = 0;
  const thinSections: string[] = [];
  for (const key of SECTION_KEYS) {
    const count = sectionCardCount(normalized[key]);
    totalCards += count;
    if (count < (SECTION_MIN_CARDS[key] ?? 0)) thinSections.push(key);
  }

  const wordEstimate = JSON.stringify(normalized).split(/\s+/).length;
  const tooThin = totalCards < MIN_TOTAL_CARDS || wordEstimate < MIN_WORD_ESTIMATE;

  return { totalCards, wordEstimate, thinSections, tooThin };
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

  // Section keys live at root level (not in a "sections" array)
  const coupleSections = ['emotionalBond', 'passion', 'karmic', 'numerology', 'growth', 'sharedShadow', 'dailyRitual', 'potential'];
  const friendSections = ['emotionalBond', 'intellectualSynergy', 'karmic', 'numerology', 'growth', 'sharedShadow', 'sharedAdventures', 'potential'];
  const expectedKeys = type === 'couple' ? coupleSections : friendSections;

  const found = expectedKeys.filter(k => json[k]);
  const missing = expectedKeys.filter(k => !json[k]);

  if (missing.length > 0) {
    // If more than half are missing, it's an error; otherwise warning
    if (missing.length > 4) {
      errors.push(`Missing sections: ${missing.join(', ')}`);
    } else {
      warnings.push(`Missing ${missing.length} sections: ${missing.join(', ')}`);
    }
  }

  if (found.length === 0 && !json.meta) {
    errors.push('Response appears to be empty or wrong format');
  }

  return { valid: errors.length === 0, errors, warnings };
}
