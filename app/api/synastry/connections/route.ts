// ============================================================
// GET /api/synastry/connections — List user's connections
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const { data: conns, error: connError } = await supabase
      .from('synastry_connections')
      .select('*')
      .or(`inviter_id.eq.${authUser.id},invitee_id.eq.${authUser.id}`)
      .order('updated_at', { ascending: false });

    if (connError) throw connError;

    const partnerIds = Array.from(new Set(
      (conns ?? [])
        .map((c) => (c.inviter_id === authUser.id ? c.invitee_id : c.inviter_id))
        .filter(Boolean)
    )) as string[];

    // Admin client bypasses RLS for cross-user lookups (partner names + readings).
    const admin = createAdminSupabase();

    const partnerMap = new Map<string, string>();
    if (partnerIds.length > 0) {
      const { data: partners } = await admin
        .from('users')
        .select('id, full_name')
        .in('id', partnerIds);
      for (const p of partners ?? []) {
        partnerMap.set(p.id, p.full_name ?? '');
      }
    }

    // Self-heal stale status: a connection whose synastry_readings row already has
    // reading_ka is "reading_generated" regardless of the connection's own status —
    // the status flip in runSynastryGeneration can be missed on some paths, which
    // otherwise leaves the settings slot stuck showing "Generating…".
    const connIds = (conns ?? []).map((c) => c.id);
    const readyConnIds = new Set<string>();
    if (connIds.length > 0) {
      const { data: readings } = await admin
        .from('synastry_readings')
        .select('connection_id, reading_ka')
        .in('connection_id', connIds);
      for (const r of readings ?? []) {
        if (r.reading_ka) readyConnIds.add(r.connection_id as string);
      }
    }

    const enriched = (conns ?? []).map((c) => {
      const partnerId = c.inviter_id === authUser.id ? c.invitee_id : c.inviter_id;
      return {
        ...c,
        status: readyConnIds.has(c.id) ? 'reading_generated' : c.status,
        partner_name: partnerId ? (partnerMap.get(partnerId) ?? null) : null,
      };
    });

    return NextResponse.json({ connections: enriched });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

