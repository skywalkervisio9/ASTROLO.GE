// ============================================================
// GET /api/onboarding/status — Tier-aware completion check
//
// Free:    done when chart_data row exists
// Invited: done when natal_readings.analysis_en exists (Call 1 complete)
// Premium (post-payment loading): done when natal_readings.reading_ka exists
// ============================================================

import { requireAuthContext } from '@/lib/auth/guards';
import { jsonOk, jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { hasFullReading } from '@/types/user';
import type { User } from '@/types/user';
import crypto from 'crypto';

function generateShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const userId = auth.authUser.id;
    const admin = createAdminSupabase();

    // Load profile to know the tier
    const { data: profile } = await admin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const user = profile as User | null;

    // Check chart_data first (all tiers need this as step 1)
    const { data: chart } = await auth.supabase
      .from('chart_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!chart?.id) {
      return jsonOk({ status: 'queued', complete: false });
    }

    // generation_* columns are populated by /api/reading/generate-full-ka
    // so silent failures surface here as 'failed' instead of the client
    // waiting out its 15-min poll cap.
    const { data: reading } = await admin
      .from('natal_readings')
      .select('id, analysis_en, reading_ka, share_slug, generation_status, generation_error, generation_started_at')
      .eq('user_id', userId)
      .maybeSingle();

    // ── PREMIUM: needs full reading (Call 2) ──
    if (user && hasFullReading(user)) {
      if (reading?.reading_ka) {
        const shareSlug = await ensureShareSlug(admin, reading.id, reading.share_slug);
        return jsonOk({ status: 'complete', complete: true, readingId: reading.id, shareSlug });
      }
      if (reading?.generation_status === 'failed') {
        return jsonOk({ status: 'failed', complete: false, error: reading.generation_error ?? 'Generation failed' });
      }
      // Promote rows past Vercel's 300s kill window — anything older than
      // 6 min in 'generating' is dead (the function was killed before it
      // could write its own failure status).
      if (
        reading?.generation_status === 'generating'
        && reading.generation_started_at
        && Date.now() - new Date(reading.generation_started_at).getTime() > 360_000
      ) {
        return jsonOk({
          status: 'failed',
          complete: false,
          error: 'Generation exceeded the 5-minute server budget. The function was killed before it could write a reading.',
        });
      }
      return jsonOk({ status: 'generating', complete: false });
    }

    // ── INVITED: needs Call 1 (analysis_en) ──
    if (user?.account_type === 'invited' || user?.account_type === 'invited+') {
      if (reading?.analysis_en && reading?.id) {
        const shareSlug = await ensureShareSlug(admin, reading.id, reading.share_slug);
        return jsonOk({ status: 'complete', complete: true, readingId: reading.id, shareSlug });
      }
      return jsonOk({ status: 'generating', complete: false });
    }

    // ── FREE: chart_data is enough — also return shareSlug if available ──
    return jsonOk({ status: 'complete', complete: true, shareSlug: reading?.share_slug ?? null });
  } catch (error) {
    return jsonServerError(error);
  }
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
