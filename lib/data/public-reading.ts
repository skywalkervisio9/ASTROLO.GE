// ============================================================
// Cached read helpers for public natal-reading pages.
//
// Two independent cache layers, joined at request time:
//
//   getReadingBodyBySlug(slug)        → reading_ka + reading_en + is_public
//                                        Effectively immutable (reading content
//                                        is generated once). Tag: reading:slug:{slug}.
//                                        Invalidated only when is_public toggles.
//
//   getUserProfileForReading(userId)  → display fields shown on the share page
//                                        (name, account_type, natal_chart_unlocked).
//                                        Mutable via settings + payment webhooks.
//                                        Tag: user:profile:{userId}.
//
// Higher-level helpers (ownership, metadata, full payload) are thin
// assemblers over these two so each cache layer revalidates independently.
// ============================================================

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { buildStaticReading } from '@/lib/chart/static-reading';

const BODY_REVALIDATE = 60 * 60 * 24;   // 24h soft floor; tag-invalidated on visibility changes
const PROFILE_REVALIDATE = 60 * 5;      // 5min soft floor; tag-invalidated on profile changes

const slugTag = (slug: string) => `reading:slug:${slug}`;
const profileTag = (userId: string) => `user:profile:${userId}`;

// --- Body cache -------------------------------------------------------------
// Holds both languages in a single entry — language toggle is a key-pluck,
// not a refetch. Chart-data injection happens here so cache hits skip the
// chart_data lookup too.

export type ReadingBody = {
  user_id: string;
  is_public: boolean;
  reading_ka: Record<string, unknown> | null;
  reading_en: Record<string, unknown> | null;
};

function injectChartData(
  reading: Record<string, unknown> | null,
  chart: { planets?: unknown; aspects?: unknown; points?: unknown } | null,
): Record<string, unknown> | null {
  if (!reading || !chart) return reading;
  if (!reading.overview || typeof reading.overview !== 'object') return reading;
  const overview = reading.overview as Record<string, unknown>;
  if (!overview.planetTable && chart.planets) overview.planetTable = chart.planets;
  if (!overview.aspects && chart.aspects) overview.aspects = chart.aspects;
  if (!overview.points && chart.points) overview.points = chart.points;
  return reading;
}

export function getReadingBodyBySlug(slug: string): Promise<ReadingBody | null> {
  return unstable_cache(
    async (): Promise<ReadingBody | null> => {
      const admin = createAdminSupabase();
      const { data: row } = await admin
        .from('natal_readings')
        .select('reading_ka, reading_en, user_id, is_public')
        .eq('share_slug', slug)
        .maybeSingle();
      if (!row) return null;

      const { data: chartRow } = await admin
        .from('chart_data')
        .select('planets, aspects, points')
        .eq('user_id', row.user_id)
        .maybeSingle();

      let reading_ka = row.reading_ka as Record<string, unknown> | null;
      let reading_en = row.reading_en as Record<string, unknown> | null;

      if (reading_ka) reading_ka = injectChartData(reading_ka, chartRow);
      else reading_ka = buildStaticReading('ka', chartRow) as Record<string, unknown>;

      if (reading_en) reading_en = injectChartData(reading_en, chartRow);
      else reading_en = buildStaticReading('en', chartRow) as Record<string, unknown>;

      return {
        user_id: row.user_id,
        is_public: !!row.is_public,
        reading_ka,
        reading_en,
      };
    },
    ['public-reading:body', slug],
    { revalidate: BODY_REVALIDATE, tags: [slugTag(slug)] },
  )();
}

// --- Profile cache ----------------------------------------------------------
// Single entry per user, reused across every reading they own and every
// language. Invalidated on profile/payment writes.

export type ReadingUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string | null;
  natal_chart_unlocked: boolean;
};

export function getUserProfileForReading(userId: string): Promise<ReadingUser | null> {
  return unstable_cache(
    async (): Promise<ReadingUser | null> => {
      const admin = createAdminSupabase();
      const { data: profile } = await admin
        .from('users')
        .select('id, full_name, email, account_type, natal_chart_unlocked')
        .eq('id', userId)
        .maybeSingle();
      if (!profile) return null;
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        account_type: profile.account_type,
        natal_chart_unlocked: profile.natal_chart_unlocked ?? false,
      };
    },
    ['user-profile-for-reading', userId],
    { revalidate: PROFILE_REVALIDATE, tags: [profileTag(userId)] },
  )();
}

// --- Assemblers (uncached; both halves are already cached) ------------------

export type ReadingOwnership = {
  user_id: string;
  is_public: boolean;
} | null;

export async function getReadingOwnership(slug: string): Promise<ReadingOwnership> {
  const body = await getReadingBodyBySlug(slug);
  return body ? { user_id: body.user_id, is_public: body.is_public } : null;
}

export type ReadingMeta = {
  user_id: string;
  is_public: boolean;
  owner_full_name: string | null;
  tagline_ka: string | null;
  tagline_en: string | null;
} | null;

function pluckTagline(reading: Record<string, unknown> | null): string | null {
  const overview = reading?.overview as { sectionTagline?: string } | undefined;
  return overview?.sectionTagline?.trim() || null;
}

export async function getReadingMeta(slug: string): Promise<ReadingMeta> {
  const body = await getReadingBodyBySlug(slug);
  if (!body) return null;

  let owner_full_name: string | null = null;
  if (body.is_public) {
    const profile = await getUserProfileForReading(body.user_id);
    owner_full_name = profile?.full_name ?? null;
  }

  return {
    user_id: body.user_id,
    is_public: body.is_public,
    owner_full_name,
    tagline_ka: pluckTagline(body.reading_ka),
    tagline_en: pluckTagline(body.reading_en),
  };
}

export type PublicReadingPayload =
  | {
      reading: Record<string, unknown> | null;
      user: ReadingUser | null;
      isPublic: true;
    }
  | { error: 'not_found' }
  | { error: 'private' };

export async function getPublicReadingFull(
  slug: string,
  lang: 'ka' | 'en',
): Promise<PublicReadingPayload> {
  const body = await getReadingBodyBySlug(slug);
  if (!body) return { error: 'not_found' };
  if (!body.is_public) return { error: 'private' };

  const user = await getUserProfileForReading(body.user_id);
  const reading = lang === 'ka' ? body.reading_ka : body.reading_en;

  return { reading, user, isPublic: true };
}

// --- Invalidation -----------------------------------------------------------

// Body cache: only stale when is_public toggles (visibility route).
export async function invalidatePublicReadingByUser(userId: string): Promise<void> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from('natal_readings')
    .select('share_slug')
    .eq('user_id', userId)
    .maybeSingle();
  if (data?.share_slug) revalidateTag(slugTag(data.share_slug), 'max');
}

export function invalidatePublicReadingBySlug(slug: string): void {
  revalidateTag(slugTag(slug), 'max');
}

// Profile cache: stale on settings + payment-driven field changes.
export function invalidateUserProfile(userId: string): void {
  revalidateTag(profileTag(userId), 'max');
}
