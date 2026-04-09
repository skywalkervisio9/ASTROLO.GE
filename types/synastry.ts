// ============================================================
// Synastry reading types — matches s4 prompt JSON output
// Two variants: Couple (romantic) and Friend (platonic)
// Field names align with SYSTEM-PROMPT-Couple_s4.md / Friend_s4.md
// ============================================================

export interface SynastryReading {
  meta: SynastryMeta;
  // Section keys live at root level (keyed by section name, not in a flat array)
  [sectionKey: string]: unknown;
}

export interface SynastryMeta {
  type: string;
  language: 'ka' | 'en';
  personA: { name: string; sun: string; moon: string; asc: string };
  personB: { name: string; sun: string; moon: string; asc: string };
  compatibilityScore: number;
  categoryScores: Record<string, number>;
}

export interface SynastrySection {
  sectionTitle: string;
  sectionSubtitle: string;
  cards: SynastryCard[];
  pullQuote: string | null;
}

export interface SynastryCard {
  id: string;
  label: string;
  title: string;
  body: string[];
  aspectType: 'harmony' | 'tension' | 'magnetic';
  elementColor: string;
  crossReferences: string[];
  expandedContent: string[] | null;
  hint: { title: string; content: string; bullets: string[] | null } | null;
}

// ── Couple sections ──
export const COUPLE_SECTION_KEYS = [
  'emotionalBond', 'passion', 'karmic', 'numerology',
  'growth', 'shadow', 'dailyRitual', 'potential'
] as const;

// ── Friend sections ──
export const FRIEND_SECTION_KEYS = [
  'emotionalBond', 'intellectualSynergy', 'karmic', 'numerology',
  'growth', 'shadow', 'sharedAdventures', 'potential'
] as const;
