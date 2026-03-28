// ============================================================
// GET /api/synastry/connections — List user's connections
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const { data: conns, error: connError } = await supabase
      .from('synastry_connections')
      .select('*')
      .or(`inviter_id.eq.${authUser.id},invitee_id.eq.${authUser.id}`);

    if (connError) throw connError;

    const partnerIds = Array.from(new Set(
      (conns ?? [])
        .map((c) => (c.inviter_id === authUser.id ? c.invitee_id : c.inviter_id))
        .filter(Boolean)
    )) as string[];

    const partnerMap = new Map<string, string>();
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', partnerIds);
      for (const p of partners ?? []) {
        partnerMap.set(p.id, p.full_name ?? '');
      }
    }

    const enriched = (conns ?? []).map((c) => {
      const partnerId = c.inviter_id === authUser.id ? c.invitee_id : c.inviter_id;
      return {
        ...c,
        partner_name: partnerId ? (partnerMap.get(partnerId) ?? null) : null,
      };
    });

    return NextResponse.json({ connections: enriched });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

