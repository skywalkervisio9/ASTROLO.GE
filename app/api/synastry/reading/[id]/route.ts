// ============================================================
// GET /api/synastry/reading/[id] — Get synastry reading by connection_id
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonForbidden, jsonServerError } from '@/lib/auth/http';
import { isConnectionMember } from '@/lib/auth/policy';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateShareSlug } from '@/lib/chart/reading-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const url = new URL(req.url);
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    // Verify user is part of the connection
    const { data: conn, error: connError } = await supabase
      .from('synastry_connections')
      .select('*')
      .eq('id', id)
      .single();
    if (connError) throw connError;
    if (!isConnectionMember(conn.inviter_id, conn.invitee_id, authUser.id)) {
      return jsonForbidden();
    }

    const admin = createAdminSupabase();

    let { data: readingRow } = await admin
      .from('synastry_readings')
      .select('reading_ka, reading_en, share_slug, is_public')
      .eq('connection_id', id)
      .maybeSingle();

    if (!readingRow) {
      return NextResponse.json({ reading: null });
    }

    let shareSlugSyn = typeof readingRow.share_slug === 'string' ? readingRow.share_slug : null;
    let isPublicSyn = readingRow.is_public !== false;

    if (!shareSlugSyn) {
      const newSlug = generateShareSlug();
      const { error: slugErr } = await admin
        .from('synastry_readings')
        .update({ share_slug: newSlug })
        .eq('connection_id', id);
      if (!slugErr) {
        shareSlugSyn = newSlug;
        readingRow = { ...readingRow, share_slug: newSlug };
      }
    }
    const userIdsForNatal = [conn.inviter_id, conn.invitee_id].filter(
      (uid): uid is string => typeof uid === 'string' && !!uid,
    );
    const [{ data: chartA }, { data: chartB }, { data: slugs }, { data: people }] = await Promise.all([
      admin.from('chart_data').select('planets, points').eq('user_id', conn.inviter_id).maybeSingle(),
      conn.invitee_id
        ? admin.from('chart_data').select('planets, points').eq('user_id', conn.invitee_id).maybeSingle()
        : Promise.resolve({ data: null }),
      userIdsForNatal.length > 0
        ? admin.from('natal_readings').select('user_id, share_slug').in('user_id', userIdsForNatal)
        : Promise.resolve({ data: [] as { user_id: string; share_slug: string | null }[] }),
      userIdsForNatal.length > 0
        ? admin.from('users').select('id, full_name, birth_day, birth_month, birth_year, birth_hour, birth_minute').in('id', userIdsForNatal)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; birth_day: number | null; birth_month: number | null; birth_year: number | null; birth_hour: number | null; birth_minute: number | null }[] }),
    ]);

    const slugMap = new Map((slugs ?? []).map(r => [r.user_id, r.share_slug]));
    const peopleMap = new Map((people ?? []).map(u => [u.id, u]));
    const personInfo = (uid: string | null) => {
      const u = uid ? peopleMap.get(uid) : undefined;
      return {
        fullName: u?.full_name ?? null,
        birth: u ? { day: u.birth_day, month: u.birth_month, year: u.birth_year, hour: u.birth_hour, minute: u.birth_minute } : null,
      };
    };

    const parsePlanets = (raw: unknown) => {
      if (!raw) return null;
      if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
      return raw;
    };

    return NextResponse.json({
      reading: lang === 'ka' ? readingRow.reading_ka : readingRow.reading_en,
      shareSlugA: slugMap.get(conn.inviter_id) ?? null,
      shareSlugB: slugMap.get(conn.invitee_id) ?? null,
      synastryShareSlug: shareSlugSyn,
      synastryIsPublic: isPublicSyn,
      synastryConnectionId: id,
      // Tell the client whether the viewer maps to personA (inviter) or
      // personB (invitee), so the UI can put the viewer on the right and
      // surface "you" / "ჩემი რუკა" semantics on their card.
      viewerIsInviter: authUser.id === conn.inviter_id,
      chartA: { planets: parsePlanets(chartA?.planets), points: parsePlanets(chartA?.points), ...personInfo(conn.inviter_id) },
      chartB: { planets: parsePlanets(chartB?.planets), points: parsePlanets(chartB?.points), ...personInfo(conn.invitee_id) },
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
