// ============================================================
// GET /api/synastry/reading/[id] — Get synastry reading by connection_id
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonForbidden, jsonServerError } from '@/lib/auth/http';
import { isConnectionMember } from '@/lib/auth/policy';
import { createAdminSupabase } from '@/lib/supabase/admin';

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

    const { data: row, error } = await supabase
      .from('synastry_readings')
      .select('reading_ka, reading_en')
      .eq('connection_id', id)
      .single();
    if (error) {
      return NextResponse.json({ reading: null });
    }

    // Fetch both users' chart data + share slugs in parallel
    const admin = createAdminSupabase();
    const [{ data: chartA }, { data: chartB }, { data: slugs }] = await Promise.all([
      admin.from('chart_data').select('planets, points').eq('user_id', conn.inviter_id).maybeSingle(),
      admin.from('chart_data').select('planets, points').eq('user_id', conn.invitee_id).maybeSingle(),
      admin.from('natal_readings').select('user_id, share_slug').in('user_id', [conn.inviter_id, conn.invitee_id]),
    ]);

    const slugMap = new Map((slugs ?? []).map(r => [r.user_id, r.share_slug]));

    const parsePlanets = (raw: unknown) => {
      if (!raw) return null;
      if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
      return raw;
    };

    return NextResponse.json({
      reading: lang === 'ka' ? row.reading_ka : row.reading_en,
      shareSlugA: slugMap.get(conn.inviter_id) ?? null,
      shareSlugB: slugMap.get(conn.invitee_id) ?? null,
      chartA: { planets: parsePlanets(chartA?.planets), points: parsePlanets(chartA?.points) },
      chartB: { planets: parsePlanets(chartB?.planets), points: parsePlanets(chartB?.points) },
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
