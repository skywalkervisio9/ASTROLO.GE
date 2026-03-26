// ============================================================
// Synastry reading types — matches Claude Call 2 JSON output
// Two variants: Couple (romantic) and Friend (platonic)
// ============================================================

export interface SynastryReading {
  meta: {
    person1: { name: string; sunSign: string; moonSign: string; rising: string };
    person2: { name: string; sunSign: string; moonSign: string; rising: string };
    relationshipType: 'couple' | 'friend';
    compatibilityScore: number;
    categoryScores: CategoryScore[];
    language: 'ka' | 'en';
    generatedAt: string;
    promptVersion: string;
  };
  sections: SynastrySection[];
}

export interface CategoryScore {
  name: string;
  nameEn: string;
  score: number;
  color: string;
  description: string;
}

export interface SynastrySection {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  iconColor: string;
  cards: SynastryCard[];
  pullQuote: string | null;
}

export interface SynastryCard {
  badge: string;
  title: string;
  body: string[];
  hint: { title: string; content: string; bullets?: string[] } | null;
  aspectTag: 'harmony' | 'tension' | 'magnetic' | null;
  elementAccent: string | null;
  crossReferences: string[];
  expandedContent: string[] | null;
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
