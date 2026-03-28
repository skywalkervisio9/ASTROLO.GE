// ============================================================
// GET /api/synastry/reading/[id] — Get synastry reading by connection_id
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonForbidden, jsonServerError } from '@/lib/auth/http';
import { isConnectionMember } from '@/lib/auth/policy';

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

    return NextResponse.json({
      reading: lang === 'ka' ? row.reading_ka : row.reading_en,
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

