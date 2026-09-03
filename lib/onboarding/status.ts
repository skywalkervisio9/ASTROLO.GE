// ============================================================
// computeOnboardingStatus — tier-aware generation-completion check.
//
// Free:    done when chart_data row exists
// Invited: done when natal_readings.analysis_en exists (Call 1 complete)
// Premium (post-payment): done when natal_readings.reading_ka exists
//
// Shared by /api/onboarding/status (client polling), /post-auth (cross-device
// login routing) and /r/[slug] (owner reloads mid-generation land back on
// /loading instead of a stale/partial reading).
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/admin';
import { hasFullReading } from '@/types/user';
import type { User } from '@/types/user';
import crypto from 'crypto';

// A full-reading run cannot exceed generate-full's maxDuration (10min). Anything
// still 'generating' past this window was hard-killed (timeout/OOM/deploy/crash)
// before the failure handler ran — treat it as dead and re-fireable, not live.
export const STALE_GENERATION_MS = 15 * 60 * 1000;

// Rough wall-clock cost of one Call-2 language regeneration, used to stretch the
// /loading bar when an auto-retry fires. KA (~44k-token cap, Mkhedruli is
// token-dense) runs ~230s; EN (~20k cap) ~100s. "Roughly" by design — the bar
// only needs to keep easing forward, not be exact.
const CALL2_RETRY_EST_MS: Record<string, number> = { ka: 230_000, en: 100_000 };
// A retry marker older than this is treated as stale (the retry has since
// finished or the run moved on) — long enough for a 5s poll to catch it, short
// enough that it never lingers into the next run.
const RETRY_MARKER_FRESH_MS = 30_000;

/** Parse the RETRYING:<langs>:<ts> marker generate-full stamps mid-run. */
function parseRetryMarker(warnings: unknown): { langs: string[]; at: number } | null {
  const arr = Array.isArray(warnings) ? warnings : [];
  const marker = arr.find((w) => typeof w === 'string' && w.startsWith('RETRYING:'));
  if (typeof marker !== 'string') return null;
  const [, langsRaw = '', tsRaw = ''] = marker.split(':');
  const langs = langsRaw.split(',').filter(Boolean);
  const at = Number(tsRaw);
  if (!langs.length || !Number.isFinite(at) || at <= 0) return null;
  return { langs, at };
}

export type OnboardingStatus = {
  // 'not_started': a full/invited reading was never launched (no
  // generation_started_at) — distinct from 'generating' so the client offers an
  // explicit Generate action instead of watch-only polling a run that isn't happening.
  status: 'queued' | 'not_started' | 'generating' | 'complete' | 'failed';
  complete: boolean;
  readingId?: string;
  shareSlug?: string | null;
  error?: string;
  /** Epoch ms of the generation launch (generation_started_at), returned only
   *  while still generating. Lets /loading resume its progress bar from the
   *  real start after a refresh instead of restarting at 0. */
  startedAt?: number;
  /** True while Call 2 is auto-regenerating a thin language (server-side, no
   *  user action). /loading flashes a transient notice instead of failing. */
  retrying?: boolean;
  /** Rough extra wall-clock the in-flight retry adds — /loading stretches its
   *  progress bar by this so it keeps easing forward instead of pinning at 100%. */
  retryEtaMs?: number;
};

function generateShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

/** Pull the human-readable reason out of the validation_warnings sentinel
 *  written by generate-full's failure path. */
function extractFailureReason(warnings: unknown): string {
  const arr = Array.isArray(warnings) ? warnings : [];
  const failed = arr.find((w) => typeof w === 'string' && w.startsWith('GENERATION_FAILED:'));
  if (typeof failed === 'string') return failed.replace('GENERATION_FAILED:', '').trim();
  return 'Generation did not complete';
}

async function ensureShareSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  readingId: string,
  existing: string | null | undefined
): Promise<string | null> {
  if (existing) return existing;
  const slug = generateShareSlug();
  const { error } = await admin
    .from('natal_readings')
    .update({ share_slug: slug })
    .eq('id', readingId);
  if (!error) return slug;
  // RLS or race: try resolve by id again (another writer may have set slug)
  const { data: row } = await admin
    .from('natal_readings')
    .select('share_slug')
    .eq('id', readingId)
    .maybeSingle();
  return row?.share_slug ?? null;
}

export async function computeOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const admin = createAdminSupabase();

  // Load profile to know the tier
  const { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const user = profile as User | null;

  // Check chart_data first (all tiers need this as step 1)
  const { data: chart } = await admin
    .from('chart_data')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!chart?.id) {
    return { status: 'queued', complete: false };
  }

  // Load natal_readings row. The generation_* columns DO exist in prod
  // (migration 010 — never dropped). Tier-2 writes generation_status so we can
  // report 'failed' here instead of returning 'generating' until the client's
  // ~15-min poll cap.
  const { data: reading } = await admin
    .from('natal_readings')
    .select('id, analysis_en, reading_ka, share_slug, generation_status, generation_started_at, validation_warnings')
    .eq('user_id', userId)
    .maybeSingle();

  // generation_started_at is set at Call 1 start and preserved through Call 2,
  // so it marks the true launch of the AI run. Surfaced only on 'generating'
  // responses below — the /loading bar rebases to it after a refresh.
  const startedAt = reading?.generation_started_at
    ? new Date(reading.generation_started_at).getTime()
    : undefined;

  // ── PREMIUM: needs full reading (Call 2) ──
  if (user && hasFullReading(user)) {
    if (reading?.reading_ka) {
      const shareSlug = await ensureShareSlug(admin, reading.id, reading.share_slug);
      return { status: 'complete', complete: true, readingId: reading.id, shareSlug };
    }
    if (reading?.generation_status === 'failed') {
      return { status: 'failed', complete: false, error: extractFailureReason(reading.validation_warnings) };
    }
    // Re-fireable when the run was never launched (no generation_started_at), OR
    // it was launched but has been 'generating' longer than any real run can take
    // (a hard kill that never reached the failure handler). Both surface as
    // 'not_started' so /loading offers a Generate/Retry action that actually
    // re-runs generate-full instead of watch-only polling a dead run.
    const stale = !!startedAt && Date.now() - startedAt > STALE_GENERATION_MS;
    if (!reading?.generation_started_at || stale) {
      return { status: 'not_started', complete: false };
    }
    // A fresh RETRYING marker ⟹ Call 2 is auto-regenerating a thin language.
    // Report it (with a rough ETA) so /loading shows a non-blocking notice and
    // stretches its bar — still 'generating', never terminal.
    const retry = parseRetryMarker(reading?.validation_warnings);
    const retrying = !!retry && Date.now() - retry.at < RETRY_MARKER_FRESH_MS;
    const retryEtaMs = retry && retrying
      ? Math.max(...retry.langs.map((l) => CALL2_RETRY_EST_MS[l] ?? 120_000))
      : undefined;
    return { status: 'generating', complete: false, startedAt, retrying, retryEtaMs };
  }

  // ── INVITED: needs Call 1 (analysis_en) ──
  if (user?.account_type === 'invited' || user?.account_type === 'invited+') {
    if (reading?.analysis_en && reading?.id) {
      const shareSlug = await ensureShareSlug(admin, reading.id, reading.share_slug);
      return { status: 'complete', complete: true, readingId: reading.id, shareSlug };
    }
    return { status: 'generating', complete: false, startedAt };
  }

  // ── FREE: chart_data is enough — also return shareSlug if available ──
  return { status: 'complete', complete: true, shareSlug: reading?.share_slug ?? null };
}
