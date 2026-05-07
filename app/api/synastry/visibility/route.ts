// ============================================================
// GET/PATCH /api/synastry/visibility — participants toggle is_public
// GET ?connectionId=  → { isPublic, shareSlug }
// PATCH { connectionId, isPublic }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { invalidatePublicSynastryByConnectionId } from '@/lib/data/public-synastry';

async function participantConnection(
  userId: string,
  connectionId: string,
) {
  const supabase = await createServerSupabase();
  const { data: conn } = await supabase
    .from('synastry_connections')
    .select('inviter_id, invitee_id')
    .eq('id', connectionId)
    .maybeSingle();
  if (!conn || (conn.inviter_id !== userId && conn.invitee_id !== userId)) {
    return null;
  }
  return conn;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const connectionId = url.searchParams.get('connectionId');
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }

    const member = await participantConnection(user.id, connectionId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: row } = await supabase
      .from('synastry_readings')
      .select('is_public, share_slug')
      .eq('connection_id', connectionId)
      .maybeSingle();

    return NextResponse.json({
      isPublic: row?.is_public ?? true,
      shareSlug: row?.share_slug ?? null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      connectionId?: unknown;
      isPublic?: unknown;
    } | null;
    if (typeof body?.connectionId !== 'string' || !body.connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }
    if (typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'Missing isPublic boolean' }, { status: 400 });
    }

    const member = await participantConnection(user.id, body.connectionId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('synastry_readings')
      .update({ is_public: body.isPublic })
      .eq('connection_id', body.connectionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await invalidatePublicSynastryByConnectionId(body.connectionId);

    return NextResponse.json({ ok: true, isPublic: body.isPublic });
  } catch (error: unknown) {
    console.error('[synastry/visibility] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
