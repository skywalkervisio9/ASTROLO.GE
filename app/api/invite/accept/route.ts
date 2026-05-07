// ============================================================
// POST /api/invite/accept — Accept synastry invite (auth required)
// Works for already-onboarded users: ties connection + triggers synastry
// when both have Call 1. Uses admin DB client (RLS blocks invitee updates).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { asNonEmptyString } from '@/lib/auth/validators';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { tryTriggerSynastryForConnection } from '@/lib/synastry/trigger-generation';
import { normalizeInviteCode } from '@/lib/utils/invite';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { authUser } = auth;

    const { code } = await req.json() as { code?: string };
    const inviteCode = normalizeInviteCode(asNonEmptyString(code) ?? '');
    if (!inviteCode) {
      return jsonBadRequest('Missing code');
    }

    const admin = createAdminSupabase();

    const [{ data: invite }, { data: conn }] = await Promise.all([
      admin.from('invite_codes').select('*').eq('code', inviteCode).maybeSingle(),
      admin
        .from('synastry_connections')
        .select('id, invitee_id, inviter_id')
        .eq('invite_code', inviteCode)
        .maybeSingle(),
    ]);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    if (!conn?.id) {
      console.error('[invite/accept] invite_codes row exists but synastry_connections missing:', inviteCode);
      return NextResponse.json({ error: 'Invite setup incomplete' }, { status: 500 });
    }

    if (conn.inviter_id === authUser.id) {
      return jsonBadRequest('You cannot use your own invite link');
    }

    if (conn.invitee_id && conn.invitee_id !== authUser.id) {
      return NextResponse.json({ error: 'Invite already used', connection_id: conn.id }, { status: 409 });
    }

    const usedByOther = invite.status === 'used' && invite.used_by && invite.used_by !== authUser.id;
    if (usedByOther) {
      return NextResponse.json({ error: 'Invite already used', connection_id: conn.id }, { status: 409 });
    }

    const alreadyMine = invite.status === 'used' && invite.used_by === authUser.id;

    if (!alreadyMine) {
      if (invite.status !== 'active') {
        return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 });
      }

      await admin
        .from('invite_codes')
        .update({ status: 'used', used_by: authUser.id, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      const { data: profile } = await admin
        .from('users')
        .select('account_type')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile?.account_type === 'free') {
        await admin.from('users').update({ account_type: 'invited' }).eq('id', authUser.id);
      }
    }

    // Always link by connection PK — retries used to skip this when alreadyMine (invite marked used but invitee_id still null).
    const { error: linkErr } = await admin
      .from('synastry_connections')
      .update({ invitee_id: authUser.id, status: 'accepted' })
      .eq('id', conn.id);

    if (linkErr) {
      console.error('[invite/accept] synastry_connections update failed:', linkErr);
      return jsonServerError(linkErr);
    }

    await tryTriggerSynastryForConnection(conn.id);

    return NextResponse.json({ success: true, connection_id: conn.id });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
