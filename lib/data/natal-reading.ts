// ============================================================
// Cached read helpers for the owner-side natal endpoint.
//
// Mirrors the public-reading split (lib/data/public-reading.ts) but
// keyed by userId — the owner has no slug context until reading time.
//
//   getNatalChartByUser(userId)    → chart_data row (planets, aspects, points)
//                                    Tag: chart:user:{userId}.
//                                    Effectively immutable post-onboarding.
//
//   getNatalReadingByUser(userId)  → natal_readings.reading_ka + reading_en
//                                    Tag: reading:user:{userId}.
//                                    Invalidated when AI generation completes.
//
// User profile (account_type / natal_chart_unlocked) reuses the cached
// getUserProfileForReading helper so a single profile cache entry per user
// serves both the public share page and the owner's own reading view.
// ============================================================

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';

const CHART_REVALIDATE = 60 * 60 * 24;   // 24h soft floor; tag-invalidated on regen
const READING_REVALIDATE = 60 * 60 * 24; // 24h soft floor; tag-invalidated on generation

const chartTag = (userId: string) => `chart:user:${userId}`;
const readingTag = (userId: string) => `reading:user:${userId}`;

export type NatalChart = {
  planets: unknown;
  aspects: unknown;
  points: unknown;
} | null;

export function getNatalChartByUser(userId: string): Promise<NatalChart> {
  return unstable_cache(
    async (): Promise<NatalChart> => {
      const admin = createAdminSupabase();
      const { data } = await admin
        .from('chart_data')
        .select('planets, aspects, points')
        .eq('user_id', userId)
        .maybeSingle();
      return data ?? null;
    },
    ['natal-chart-by-user', userId],
    { revalidate: CHART_REVALIDATE, tags: [chartTag(userId)] },
  )();
}

export type NatalReadingBody = {
  reading_ka: Record<string, unknown> | null;
  reading_en: Record<string, unknown> | null;
} | null;

export function getNatalReadingByUser(userId: string): Promise<NatalReadingBody> {
  return unstable_cache(
    async (): Promise<NatalReadingBody> => {
      const admin = createAdminSupabase();
      const { data } = await admin
        .from('natal_readings')
        .select('reading_ka, reading_en')
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) return null;
      return {
        reading_ka: data.reading_ka as Record<string, unknown> | null,
        reading_en: data.reading_en as Record<string, unknown> | null,
      };
    },
    ['natal-reading-by-user', userId],
    { revalidate: READING_REVALIDATE, tags: [readingTag(userId)] },
  )();
}

// --- Invalidation -----------------------------------------------------------

export function invalidateNatalChart(userId: string): void {
  revalidateTag(chartTag(userId), 'max');
}

export function invalidateNatalReading(userId: string): void {
  revalidateTag(readingTag(userId), 'max');
}
