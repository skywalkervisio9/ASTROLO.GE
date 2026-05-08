// ============================================================
// DELETE /api/user/delete — Permanently delete the authenticated user's
// account and all associated data from the database.
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';

export async function DELETE() {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { authUser } = auth;
    const uid = authUser.id;

    const admin = createAdminSupabase();

    // Delete all user data in dependency order (FK-safe)
    await Promise.all([
      admin.from('synastry_readings').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
      admin.from('natal_readings').delete().eq('user_id', uid),
      admin.from('chart_data').delete().eq('user_id', uid),
    ]);

    // Synastry connections reference the user — delete those too
    await admin.from('synastry_connections').delete().or(`inviter_id.eq.${uid},invitee_id.eq.${uid}`);

    // Delete the public users row
    await admin.from('users').delete().eq('id', uid);

    // Delete the auth user (removes session + login ability)
    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr) throw authErr;

    // Clear SSR auth cookies so /auth doesn't loop redirecting through
    // /post-auth: the deleted user's JWT lingers in cookies until we
    // explicitly sign out the SSR client.
    try {
      const ssr = await createServerSupabase();
      await ssr.auth.signOut();
    } catch {
      /* best-effort — client-side signOut also runs after this returns */
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
