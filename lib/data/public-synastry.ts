// ============================================================
// Cached read helpers for public synastry share pages (/s/[slug])
// Mirrors lib/data/public-reading.ts pattern.
// ============================================================

import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';

const BODY_REVALIDATE = 60 * 60 * 24;
const PROFILE_REVALIDATE = 60 * 5;

const slugTag = (slug: string) => `synastry:slug:${slug}`;
const profileTag = (userId: string) => `user:profile:${userId}`;

export type SynastryChartSnapshot = {
  planets: unknown;
  points: unknown;
};

export type SynastryBody = {
  connection_id: string;
  user1_id: string;
  user2_id: string;
  is_public: boolean;
  reading_ka: Record<string, unknown> | null;
  reading_en: Record<string, unknown> | null;
};

function parseStoredJson(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function getSynastryBodyBySlug(slug: string): Promise<SynastryBody | null> {
  return unstable_cache(
    async (): Promise<SynastryBody | null> => {
      const admin = createAdminSupabase();
      const { data: row } = await admin
        .from('synastry_readings')
        .select('reading_ka, reading_en, user1_id, user2_id, connection_id, is_public')
        .eq('share_slug', slug)
        .maybeSingle();
      if (!row) return null;

      return {
        connection_id: row.connection_id as string,
        user1_id: row.user1_id as string,
        user2_id: row.user2_id as string,
        is_public: !!row.is_public,
        reading_ka: (parseStoredJson(row.reading_ka) as Record<string, unknown>) ?? null,
        reading_en: (parseStoredJson(row.reading_en) as Record<string, unknown>) ?? null,
      };
    },
    ['public-synastry:body', slug],
    { revalidate: BODY_REVALIDATE, tags: [slugTag(slug)] },
  )();
}

export async function getSynastryChartsForParticipants(
  user1Id: string,
  user2Id: string,
): Promise<{ chartA: SynastryChartSnapshot; chartB: SynastryChartSnapshot }> {
  const admin = createAdminSupabase();
  const [{ data: a }, { data: b }] = await Promise.all([
    admin.from('chart_data').select('planets, points').eq('user_id', user1Id).maybeSingle(),
    admin.from('chart_data').select('planets, points').eq('user_id', user2Id).maybeSingle(),
  ]);
  return {
    chartA: { planets: parseStoredJson(a?.planets), points: parseStoredJson(a?.points) },
    chartB: { planets: parseStoredJson(b?.planets), points: parseStoredJson(b?.points) },
  };
}

type ReadingProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string | null;
};

function getMinimalProfileCached(userId: string): Promise<ReadingProfile | null> {
  return unstable_cache(
    async (): Promise<ReadingProfile | null> => {
      const admin = createAdminSupabase();
      const { data: profile } = await admin
        .from('users')
        .select('id, full_name, email, account_type')
        .eq('id', userId)
        .maybeSingle();
      if (!profile) return null;
      return {
        id: profile.id as string,
        full_name: profile.full_name ?? null,
        email: profile.email ?? null,
        account_type: profile.account_type ?? null,
      };
    },
    ['synastry-share-profile', userId],
    { revalidate: PROFILE_REVALIDATE, tags: [profileTag(userId)] },
  )();
}

export type SynastryShareUsers = {
  personA: { id: string; full_name: string | null };
  personB: { id: string; full_name: string | null };
};

export async function getSynastryParticipantProfiles(
  user1Id: string,
  user2Id: string,
): Promise<SynastryShareUsers | null> {
  const [p1, p2] = await Promise.all([
    getMinimalProfileCached(user1Id),
    getMinimalProfileCached(user2Id),
  ]);
  if (!p1 || !p2) return null;
  return {
    personA: { id: p1.id, full_name: p1.full_name },
    personB: { id: p2.id, full_name: p2.full_name },
  };
}

export type SynastryOwnership = {
  connection_id: string;
  user1_id: string;
  user2_id: string;
  is_public: boolean;
} | null;

export async function getSynastryOwnership(slug: string): Promise<SynastryOwnership> {
  const body = await getSynastryBodyBySlug(slug);
  if (!body) return null;
  return {
    connection_id: body.connection_id,
    user1_id: body.user1_id,
    user2_id: body.user2_id,
    is_public: body.is_public,
  };
}

export type SynastryMeta = {
  connection_id: string;
  is_public: boolean;
  title_ka: string | null;
  title_en: string | null;
  compatibility_score: number | null;
} | null;

function pluckHeroLine(reading: Record<string, unknown> | null, lang: 'ka' | 'en'): string | null {
  const meta = reading?.meta as Record<string, unknown> | undefined;
  if (!meta) return null;
  const personA = meta.personA as { name?: string } | undefined;
  const personB = meta.personB as { name?: string } | undefined;
  const a = personA?.name?.trim() || '';
  const b = personB?.name?.trim() || '';
  if (!a && !b) return null;
  if (lang === 'ka') return `${a} · ${b}`.trim();
  return `${a} & ${b}`.trim();
}

export async function getSynastryMeta(slug: string): Promise<SynastryMeta> {
  const body = await getSynastryBodyBySlug(slug);
  if (!body) return null;
  const enMeta = body.reading_en?.meta as Record<string, unknown> | undefined;
  const kaMeta = body.reading_ka?.meta as Record<string, unknown> | undefined;
  const raw =
    typeof enMeta?.compatibilityScore === 'number'
      ? enMeta.compatibilityScore
      : typeof kaMeta?.compatibilityScore === 'number'
        ? kaMeta.compatibilityScore
        : null;
  const score = raw != null ? Math.round(raw) : null;

  return {
    connection_id: body.connection_id,
    is_public: body.is_public,
    title_ka: pluckHeroLine(body.reading_ka, 'ka'),
    title_en: pluckHeroLine(body.reading_en, 'en'),
    compatibility_score: score,
  };
}

export type PublicSynastryPayload =
  | {
      reading: Record<string, unknown> | null;
      chartA: SynastryChartSnapshot;
      chartB: SynastryChartSnapshot;
      users: SynastryShareUsers;
      shareSlugA: string | null;
      shareSlugB: string | null;
      isPublic: boolean;
    }
  | { error: 'not_found' }
  | { error: 'private' };

async function natalShareSlugsFor(user1Id: string, user2Id: string) {
  const admin = createAdminSupabase();
  const { data: rows } = await admin
    .from('natal_readings')
    .select('user_id, share_slug')
    .in('user_id', [user1Id, user2Id]);
  const m = new Map((rows ?? []).map((r) => [r.user_id as string, r.share_slug as string | null]));
  return {
    shareSlugA: m.get(user1Id) ?? null,
    shareSlugB: m.get(user2Id) ?? null,
  };
}

export async function getPublicSynastryFull(
  slug: string,
  lang: 'ka' | 'en',
): Promise<PublicSynastryPayload> {
  const payload = await buildSynastrySharePayload(slug, lang);
  if ('error' in payload) return payload;
  if (!payload.isPublic) return { error: 'private' };
  return payload;
}

/** Full payload for a slug (public or private). Caller must enforce access for private rows. */
export async function buildSynastrySharePayload(
  slug: string,
  lang: 'ka' | 'en',
): Promise<
  | {
      reading: Record<string, unknown> | null;
      chartA: SynastryChartSnapshot;
      chartB: SynastryChartSnapshot;
      users: SynastryShareUsers;
      shareSlugA: string | null;
      shareSlugB: string | null;
      isPublic: boolean;
    }
  | { error: 'not_found' }
> {
  const body = await getSynastryBodyBySlug(slug);
  if (!body) return { error: 'not_found' };

  const [charts, users, slugs] = await Promise.all([
    getSynastryChartsForParticipants(body.user1_id, body.user2_id),
    getSynastryParticipantProfiles(body.user1_id, body.user2_id),
    natalShareSlugsFor(body.user1_id, body.user2_id),
  ]);

  if (!users) return { error: 'not_found' };

  const reading = lang === 'ka' ? body.reading_ka : body.reading_en;

  return {
    reading,
    chartA: charts.chartA,
    chartB: charts.chartB,
    users,
    shareSlugA: slugs.shareSlugA,
    shareSlugB: slugs.shareSlugB,
    isPublic: !!body.is_public,
  };
}
export async function invalidatePublicSynastryBySlug(slug: string): Promise<void> {
  revalidateTag(slugTag(slug), { expire: 0 });
}

export async function invalidatePublicSynastryByConnectionId(
  connectionId: string,
): Promise<void> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from('synastry_readings')
    .select('share_slug')
    .eq('connection_id', connectionId)
    .maybeSingle();
  if (data?.share_slug) {
    await invalidatePublicSynastryBySlug(data.share_slug as string);
  }
}
