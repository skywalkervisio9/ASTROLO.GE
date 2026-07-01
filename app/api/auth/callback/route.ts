// ============================================================
// OAuth callback — exchanges code for session
// Next.js 16: createServerSupabase() is async
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { consumeOauthStateCookie } from '@/lib/auth/oauth-state';
import { sanitizeNextPath } from '@/lib/auth/redirect';
import { ensureUserProfileRow } from '@/lib/auth/profile';
import { fetchGoogleBirthday } from '@/lib/auth/google-people';
import { authAudit } from '@/lib/auth/audit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));
  const state = searchParams.get('state');

  if (code) {
    // OAuth logins carry a `state` param (issued by /api/auth/oauth/start) plus a
    // matching httpOnly cookie — enforce that CSRF check for them. Supabase email
    // links (password recovery, magic link, email confirmation) arrive with a
    // `code` but NO `state`; their guard is the single-use PKCE code_verifier
    // cookie that exchangeCodeForSession validates below. So only gate on the
    // state cookie when a state param is actually present, otherwise a valid
    // recovery link is wrongly rejected as invalid_oauth_state.
    if (state) {
      const stateValid = await consumeOauthStateCookie(state);
      if (!stateValid) {
        authAudit({ event: 'oauth.callback', route: '/api/auth/callback', outcome: 'failure', details: { reason: 'state_mismatch' } });
        return NextResponse.redirect(`${origin}/auth?error=invalid_oauth_state`);
      }
    }

    const supabase = await createServerSupabase();
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData.user;
        if (u) {
          // Best-effort DOB pre-fill: if the OAuth flow returned a Google
          // provider token and the user shared their birthday, persist it
          // so the birth form arrives pre-populated. Failures are silent —
          // most users will still need to type in time/place anyway.
          let birthday: { day: number | null; month: number | null; year: number | null } | null = null;
          const providerToken = exchangeData?.session?.provider_token;
          if (providerToken) {
            birthday = await fetchGoogleBirthday(providerToken);
          }
          await ensureUserProfileRow({
            user: u,
            birthDay: birthday?.day ?? null,
            birthMonth: birthday?.month ?? null,
            birthYear: birthday?.year ?? null,
          });
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
