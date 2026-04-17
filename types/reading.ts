// ============================================================
// Natal reading types — matches Claude Call 2 JSON output
// ============================================================

export interface NatalReading {
  meta: {
    name: string;
    birthData: string;
    sunSign: string;
    moonSign: string;
    risingSign: string;
    language: 'ka' | 'en';
    generatedAt: string;
    promptVersion: string;
  };
  overview: OverviewSection;
  mission: ContentSection;
  characteristics: ContentSection;
  relationships: ContentSection;
  work: ContentSection;
  shadow: ContentSection;
  spiritual: ContentSection;
  potential: ContentSection;
}

export interface OverviewSection {
  sectionTitle: string;
  sectionTagline: string;
  planetTable: PlanetRow[];
  aspects: Aspect[];
  coreCards: Card[];
  pullQuote: string | null;
}

export interface ContentSection {
  sectionTitle: string;
  sectionTagline: string;
  cards: Card[];
  pullQuote: string | null;
}

export interface Card {
  id: string;
  label: string;
  title: string;
  body: string[];
  crossReferences: string[];
  expandedContent: string[] | null;
  hint: {
    title: string;
    content: string;
    bullets: string[] | null;
  } | null;
  accentElement: 'fire' | 'earth' | 'air' | 'water' | null;
}

export interface PlanetRow {
  planet: string;
  symbol: string;
  sign: string;
  degree: string;
  house: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  retrograde: boolean;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspectType: 'conjunction' | 'trine' | 'square' | 'opposition' | 'sextile';
  aspectSymbol: string;
  significance: 'high' | 'normal';
}

// ── Section navigation ──
export const SECTION_KEYS = [
  'overview', 'mission', 'characteristics', 'relationships',
  'work', 'shadow', 'spiritual', 'potential'
] as const;

export type SectionKey = typeof SECTION_KEYS[number];

