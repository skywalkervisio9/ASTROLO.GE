// ============================================================
// Chart-data → reading helpers
// Shared between chart/generate, reading/generate-full, etc.
// ============================================================

import crypto from 'crypto';

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋', Lilith: '⚸', Chiron: '⚷',
};

export const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌', trine: '△', square: '□', opposition: '☍', sextile: '⚹',
};

export interface StoredPlanet {
  name: string; sign: string; degree: string; house: string; element: string; retrograde: boolean;
}
export interface StoredPoints {
  ascendant?: { sign: string; degree: string };
  [key: string]: unknown;
}
export interface StoredAspect {
  planet1: string; planet2: string; aspect: string; orb: number;
}
export type SingleLangInterp = {
  planet1: string; planet2: string; aspect: string; interpretation: string; significance: 'high' | 'normal';
};

export function generateShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

/** Convert sign name + "14°36'" degree string to absolute ecliptic (0-360) */
function signDegToEcl(sign: string, degree: string): number {
  const idx = ZODIAC_SIGNS.indexOf(sign);
  if (idx === -1) return 0;
  const match = degree.match(/(\d+)[°](\d+)['']?/);
  const d = match ? parseInt(match[1]) : parseFloat(degree) || 0;
  const m = match ? parseInt(match[2]) : 0;
  return idx * 30 + d + m / 60;
}

/** Equal House: house index from planet ecliptic + ASC ecliptic */
function equalHouseRoman(planetEcl: number, ascEcl: number): string {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const idx = Math.floor(((planetEcl - ascEcl + 360) % 360) / 30);
  return ROMAN[idx] ?? 'I';
}

/**
 * Build planetTable for reading.overview from chart_data.
 * Adds Unicode symbol per planet, computes Equal House if missing.
 */
export function buildPlanetTableForReading(
  planets: StoredPlanet[] | null,
  points: StoredPoints | null
): unknown[] {
  if (!planets || planets.length === 0) return [];

  const needsHouse = planets.some(p => !p.house);
  let ascEcl = 0;
  if (needsHouse && points?.ascendant) {
    ascEcl = signDegToEcl(points.ascendant.sign, points.ascendant.degree);
  }

  return planets.map(p => ({
    planet: p.name,
    symbol: PLANET_SYMBOLS[p.name] ?? '',
    sign: p.sign,
    degree: p.degree,
    house: p.house || (needsHouse ? equalHouseRoman(signDegToEcl(p.sign, p.degree), ascEcl) : ''),
    element: (p.element || '').toLowerCase() as 'fire' | 'earth' | 'air' | 'water',
    retrograde: p.retrograde ?? false,
  }));
}

// Georgian planet names → English (for aspect interpretation key matching)
const KA_TO_EN_PLANET: Record<string, string> = {
  მზე: 'Sun', მთვარე: 'Moon', მერკური: 'Mercury', ვენერა: 'Venus', მარსი: 'Mars',
  იუპიტერი: 'Jupiter', სატურნი: 'Saturn', ურანი: 'Uranus', ნეპტუნი: 'Neptune',
  პლუტონი: 'Pluto', ჩრდილოეთი_კვანძი: 'North Node', სამხრეთი_კვანძი: 'South Node',
  ლილითი: 'Lilith', ქირონი: 'Chiron',
};

function normalizePlanetName(name: string): string {
  return KA_TO_EN_PLANET[name] ?? name;
}

/**
 * Merge chart_data aspects with AI-generated interpretations.
 * Adds symbol fields, matches by planet1+planet2+aspect key.
 * Normalizes Georgian planet names to English before matching.
 */
export function mergeAspectsForReading(
  aspects: StoredAspect[] | null,
  interpretations: SingleLangInterp[]
): unknown[] {
  if (!aspects || aspects.length === 0) return [];

  const interpMap = new Map<string, SingleLangInterp>();
  for (const interp of interpretations) {
    const asp = interp.aspect.toLowerCase();
    const p1 = normalizePlanetName(interp.planet1);
    const p2 = normalizePlanetName(interp.planet2);
    const key = `${p1}+${p2}+${asp}`;
    interpMap.set(key, interp);
    interpMap.set(`${p2}+${p1}+${asp}`, interp);
  }

  return aspects.map(a => {
    const key = `${a.planet1}+${a.planet2}+${a.aspect.toLowerCase()}`;
    const interp = interpMap.get(key);
    return {
      planet1: a.planet1,
      symbol1: PLANET_SYMBOLS[a.planet1] ?? '',
      planet2: a.planet2,
      symbol2: PLANET_SYMBOLS[a.planet2] ?? '',
      aspectType: a.aspect,
      aspectSymbol: ASPECT_SYMBOLS[a.aspect] ?? '',
      orb: a.orb,
      interpretation: interp?.interpretation ?? '',
      significance: interp?.significance ?? 'normal',
    };
  });
}

/** Strip meta and inject planetTable + aspects into reading.overview */
export function injectAndClean(
  reading: Record<string, unknown>,
  planetTable: unknown[],
  aspects: unknown[]
): Record<string, unknown> {
  const r = { ...reading };
  delete r.meta;
  if (r.overview && typeof r.overview === 'object') {
    r.overview = { ...(r.overview as Record<string, unknown>), planetTable, aspects };
  }
  return r;
}
