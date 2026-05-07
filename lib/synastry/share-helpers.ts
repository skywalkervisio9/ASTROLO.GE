// ============================================================
// Synastry persistence helpers — scores from AI JSON, share slug flow
// ============================================================

/** Pull compatibility fields from reading.meta (English row preferred for numerics). */
export function extractSynastryScores(reading: Record<string, unknown>): {
  compatibility_score: number | null;
  category_scores: Record<string, unknown> | null;
} {
  const meta = reading.meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { compatibility_score: null, category_scores: null };
  }
  const m = meta as Record<string, unknown>;
  const score = typeof m.compatibilityScore === 'number' ? Math.round(m.compatibilityScore) : null;
  const cats = m.categoryScores;
  const category_scores =
    cats && typeof cats === 'object' && !Array.isArray(cats) ? (cats as Record<string, unknown>) : null;
  return { compatibility_score: score, category_scores };
}
