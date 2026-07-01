// ============================================================
// Email-link confirmation — verifies a one-time email token
// (password recovery, magic link, email confirmation) and
// establishes the session, then redirects to `next`.
//
// Unlike /api/auth/callback (OAuth code exchange), this uses the
// token_hash + verifyOtp pattern, which needs no PKCE code_verifier
// cookie — so it works even when the link is opened in a different
// browser/device than the one that requested it. Supabase email
// templates point here via {{ .TokenHash }}.
// Next.js 16: createServerSupabase() and cookies() are async.
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { sanitizeNextPath } from '@/lib/auth/redirect';
import { authAudit } from '@/lib/auth/audit';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get('next'));

  if (token_hash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      authAudit({ event: 'email.confirm', route: '/api/auth/confirm', outcome: 'success', details: { type } });
      return NextResponse.redirect(`${origin}${next}`);
    }
    authAudit({ event: 'email.confirm', route: '/api/auth/confirm', outcome: 'failure', details: { type, reason: error.message } });
  } else {
    authAudit({ event: 'email.confirm', route: '/api/auth/confirm', outcome: 'failure', details: { reason: 'missing_token_hash_or_type' } });
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}
