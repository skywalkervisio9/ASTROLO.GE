// ============================================================
// Zodiac sign localization for OG share cards. English canonical
// sign names (as stored in chart_data) → KA/EN display names.
// Nominative case only — the cards show a bare "☉ Cancer" label.
// ============================================================

export type OgLang = 'ka' | 'en';

const SIGN_KEY: Record<string, string> = {
  aries: 'aries', taurus: 'taurus', gemini: 'gemini', cancer: 'cancer',
  leo: 'leo', virgo: 'virgo', libra: 'libra', scorpio: 'scorpio',
  sagittarius: 'sagittarius', capricorn: 'capricorn', aquarius: 'aquarius', pisces: 'pisces',
};

const SIGN_EN: Record<string, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};

const SIGN_KA: Record<string, string> = {
  aries: 'ვერძი', taurus: 'კურო', gemini: 'ტყუპები', cancer: 'კირჩხიბი',
  leo: 'ლომი', virgo: 'ქალწული', libra: 'სასწორი', scorpio: 'მორიელი',
  sagittarius: 'მშვილდოსანი', capricorn: 'თხის რქა', aquarius: 'მერწყული', pisces: 'თევზები',
};

/** Localized nominative name for an English sign (e.g. "Cancer" → "კირჩხიბი").
 *  Returns null for an unknown/empty sign. */
export function localizedSignName(englishSign: string | null | undefined, lang: OgLang): string | null {
  if (!englishSign) return null;
  const key = SIGN_KEY[englishSign.trim().toLowerCase()];
  if (!key) return null;
  return (lang === 'ka' ? SIGN_KA : SIGN_EN)[key];
}
