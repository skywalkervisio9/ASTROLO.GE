// ============================================================
// Cached read helpers for the owner-side natal endpoint.
//
//   getNatalChartByUser(userId)  → chart_data row (planets, aspects, points)
//                                  Tag: chart:user:{userId}. Effectively
//                                  immutable post-onboarding.
//
// Profile + reading body are read uncached in the natal route — they're the
// tier-gating data that change at generation time, and SWR-style propagation
// lag was rendering empty readings on first nav after a fresh upgrade.
// ============================================================

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';

const CHART_REVALIDATE = 60 * 60 * 24; // 24h soft floor; tag-invalidated on regen

const chartTag = (userId: string) => `chart:user:${userId}`;

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

// `{ expire: 0 }` forces immediate expiration — the next read fetches fresh
// data instead of stale-while-revalidate. Required for read-your-own-writes
// after a chart re-generation.
export function invalidateNatalChart(userId: string): void {
  revalidateTag(chartTag(userId), { expire: 0 });
}
