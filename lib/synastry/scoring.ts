// ============================================================
// Synastry scoring — deterministic overall + tier resolution.
//
// The AI proposes the six per-category scores (it is good at
// qualitative judgment). This module owns the AGGREGATE (code is
// good at arithmetic), so the headline compatibility number can
// never contradict the category bars it is drawn from.
//
// `challenge` is friction, not a virtue: it TEMPERS the score
// (we count 100 - challenge), so more friction pulls the overall
// down rather than inflating it.
// ============================================================

import type { Language } from '@/types/user';

export type RelationshipType = 'couple' | 'friend';

// The category keys the model emits (see SYSTEM-PROMPT-*_s7.md). Couple's 3rd
// resonance is `passion`; friend's is `values` — otherwise identical.
export const CHALLENGE_KEY = 'challenge';

// Weights sum to 1.0 within each variant. Friendships lean on intellectual
// synergy and shared growth; couples lean on emotional bond and passion.
// `challenge` is friction — it is inverted (100 - challenge) in the sum below.
const COUPLE_WEIGHTS: Record<string, number> = {
  emotional: 0.22, passion: 0.20, karmic: 0.20, growth: 0.16, intellectual: 0.12, challenge: 0.10,
};
const FRIEND_WEIGHTS: Record<string, number> = {
  emotional: 0.20, intellectual: 0.22, growth: 0.18, karmic: 0.16, values: 0.10, challenge: 0.14,
};

function clampScore(v: unknown): number | null {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, v));
}

/**
 * Weighted average of the six category scores, with `challenge`
 * inverted so friction reduces the total. Weights are re-normalised
 * over whichever categories are actually present, so a reading that
 * omits a category still yields a sane number.
 */
export function computeOverallScore(
  categoryScores: Record<string, unknown> | null | undefined,
  type: RelationshipType,
): number {
  const cats = categoryScores ?? {};
  const weights = type === 'friend' ? FRIEND_WEIGHTS : COUPLE_WEIGHTS;

  let sum = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const raw = clampScore(cats[key]);
    if (raw == null) continue;
    const contribution = key === CHALLENGE_KEY ? 100 - raw : raw;
    sum += contribution * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;
  return Math.round(sum / weightSum);
}

// Tier bands, ordered high → low. `min` is inclusive. Each carries a one-line
// description so the Deep Resonance card explains what the band means, not just
// names it.
const TIERS: { min: number; ka: string; en: string; kaDesc: string; enDesc: string }[] = [
  { min: 85, ka: 'იშვიათი თანხვედრა', en: 'Rare Alignment',
    enDesc: 'A rare, near-effortless meeting of two charts.',
    kaDesc: 'ორი რუკის იშვიათი, თითქმის უნაკლო შეხვედრა.' },
  { min: 70, ka: 'ღრმა რეზონანსი', en: 'Deep Resonance',
    enDesc: 'A strong, resonant bond with genuine depth and staying power.',
    kaDesc: 'ღრმა, რეზონანსული კავშირი, რომელსაც სიმტკიცე და გამძლეობა აქვს.' },
  { min: 55, ka: 'თბილი დინება', en: 'Warm Current',
    enDesc: 'A warm, workable connection with clear room to grow.',
    kaDesc: 'თბილი, ცოცხალი კავშირი, რომელსაც ზრდის ნათელი სივრცე აქვს.' },
  { min: 40, ka: 'ფესვების გადგმა', en: 'Finding Its Footing',
    enDesc: 'A bond that asks for patience and conscious effort.',
    kaDesc: 'კავშირი, რომელიც მოთმინებას და შეგნებულ ძალისხმევას ითხოვს.' },
  { min: 0, ka: 'გზაჯვარედინი', en: 'Crossed Wires',
    enDesc: 'A demanding match that grows through friction.',
    kaDesc: 'რთული შესატყვისობა, რომელიც დაძაბულობის გავლით იზრდება.' },
];

export interface TierResult {
  label: string;
  /** One-line description of what the band means. */
  description: string;
  /** 1-based rank from the bottom (1 = lowest band). */
  rank: number;
  /** Total number of bands. */
  total: number;
}

/** Map an overall score to its named tier + description + rank (for the band pips). */
export function resolveTier(score: number, language: Language): TierResult {
  const total = TIERS.length;
  const t = TIERS.find((band) => score >= band.min) ?? TIERS[TIERS.length - 1];
  const idx = TIERS.indexOf(t);
  return {
    label: language === 'ka' ? t.ka : t.en,
    description: language === 'ka' ? t.kaDesc : t.enDesc,
    rank: total - idx,
    total,
  };
}
