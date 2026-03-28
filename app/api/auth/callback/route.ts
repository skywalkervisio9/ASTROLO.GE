// ============================================================
// OAuth callback — exchanges code for session
// Next.js 16: createServerSupabase() is async
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { consumeOauthStateCookie } from '@/lib/auth/oauth-state';
import { sanitizeNextPath } from '@/lib/auth/redirect';
import { ensureUserProfileRow } from '@/lib/auth/profile';
import { authAudit } from '@/lib/auth/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));
  const state = searchParams.get('state');

  if (code) {
    const stateValid = await consumeOauthStateCookie(state);
    if (!stateValid) {
      authAudit({ event: 'oauth.callback', route: '/api/auth/callback', outcome: 'failure', details: { reason: 'state_mismatch' } });
      return NextResponse.redirect(`${origin}/auth?error=invalid_oauth_state`);
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        if (u) {
          await ensureUserProfileRow({ user: u });
          authAudit({ event: 'oauth.callback', route: '/api/auth/callback', userId: u.id, outcome: 'success' });
        }
      } catch (e) {
        console.warn('profile upsert in auth callback failed', e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  authAudit({ event: 'oauth.callback', route: '/api/auth/callback', outcome: 'failure', details: { reason: 'exchange_failed' } });
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}
