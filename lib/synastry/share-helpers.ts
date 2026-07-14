// ============================================================
// Synastry persistence helpers — scores from AI JSON, share slug flow
// ============================================================

import { computeOverallScore } from '@/lib/synastry/scoring';

/**
 * Pull compatibility fields from reading.meta (English row preferred for numerics).
 * The model no longer emits a standalone compatibilityScore (s7) — the overall is
 * DERIVED in code from the six categoryScores, so the stored value can never
 * contradict the category bars the UI renders.
 */
export function extractSynastryScores(reading: Record<string, unknown>): {
  compatibility_score: number | null;
  category_scores: Record<string, unknown> | null;
} {
  const meta = reading.meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { compatibility_score: null, category_scores: null };
  }
  const m = meta as Record<string, unknown>;
  const cats = m.categoryScores;
  const category_scores =
    cats && typeof cats === 'object' && !Array.isArray(cats) ? (cats as Record<string, unknown>) : null;
  const type = m.type === 'synastry_friend' ? 'friend' : 'couple';
  const compatibility_score = category_scores ? computeOverallScore(category_scores, type) : null;
  return { compatibility_score, category_scores };
}
