// ============================================================
// POST /api/synastry/start — Authenticated: run synastry generation now
// (same work as internal /api/synastry/generate). Awaits completion.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { isConnectionMember } from '@/lib/auth/policy';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { runSynastryGeneration } from '@/lib/synastry/run-generation';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { authUser } = auth;

    const body = (await req.json().catch(() => ({}))) as { connection_id?: string };
    const admin = createAdminSupabase();

    let connectionId = typeof body.connection_id === 'string' ? body.connection_id.trim() : '';

    if (!connectionId) {
      const { data: rows } = await admin
        .from('synastry_connections')
        .select('id, inviter_id, invitee_id, status')
        .or(`inviter_id.eq.${authUser.id},invitee_id.eq.${authUser.id}`)
        .not('invitee_id', 'is', null)
        .neq('status', 'reading_generated')
        .order('updated_at', { ascending: false })
        .limit(1);

      connectionId = rows?.[0]?.id ?? '';
    }

    if (!connectionId) {
      return jsonBadRequest('No synastry connection to generate');
    }

    const { data: conn, error: connErr } = await admin
      .from('synastry_connections')
      .select('inviter_id, invitee_id')
      .eq('id', connectionId)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (!isConnectionMember(conn.inviter_id, conn.invitee_id, authUser.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await runSynastryGeneration(connectionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({ status: result.status });
  } catch (error: unknown) {
    console.error('[synastry/start] error:', error);
    return jsonServerError(error);
  }
}
