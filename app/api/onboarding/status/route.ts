import { requireAuthContext } from '@/lib/auth/guards';
import { jsonOk, jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import crypto from 'crypto';

function generateShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const userId = auth.authUser.id;

    // Step 1: check reading exists (id always exists, safe without migration)
    const { data: reading } = await auth.supabase
      .from('natal_readings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (reading?.id) {
      // Step 2: try to get share_slug (requires migration — may not exist yet)
      let shareSlug: string | null = null;
      const admin = createAdminSupabase();

      const { data: slugRow } = await admin
        .from('natal_readings')
        .select('share_slug')
        .eq('id', reading.id)
        .maybeSingle();

      shareSlug = (slugRow as { share_slug?: string | null } | null)?.share_slug ?? null;

      // Backfill missing slug for readings created before migration
      if (slugRow && !shareSlug) {
        shareSlug = generateShareSlug();
        const { error } = await admin
          .from('natal_readings')
          .update({ share_slug: shareSlug })
          .eq('id', reading.id);
        if (error) shareSlug = null; // migration column not yet added
      }

      return jsonOk({ status: 'complete', readingId: reading.id, shareSlug });
    }

    const { data: chart } = await auth.supabase
      .from('chart_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return jsonOk({
      status: chart?.id ? 'generating' : 'queued',
      readingId: null,
    });
  } catch (error) {
    return jsonServerError(error);
  }
}
