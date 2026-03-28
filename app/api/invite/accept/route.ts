// ============================================================
// POST /api/invite/accept — Mark invite used (auth required)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { asNonEmptyString } from '@/lib/auth/validators';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const { code } = await req.json() as { code?: string };
    const inviteCode = asNonEmptyString(code);
    if (!inviteCode) {
      return jsonBadRequest('Missing code');
    }

    const { data: invite } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('status', 'active')
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    await supabase
      .from('invite_codes')
      .update({ status: 'used', used_by: authUser.id, used_at: new Date().toISOString() })
      .eq('id', invite.id);

    await supabase
      .from('synastry_connections')
      .update({ invitee_id: authUser.id, status: 'accepted' })
      .eq('invite_code', inviteCode);

    await supabase
      .from('users')
      .update({ account_type: 'invited' })
      .eq('id', authUser.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

