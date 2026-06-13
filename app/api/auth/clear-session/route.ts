// ============================================================
// GET /api/auth/clear-session — sign out (clear sb-* cookies) and
// redirect to ?next=. Used by /post-auth when getUser() rejects the
// session, because a Server Component can't set cookies — only a
// Route Handler can. Without this hop, /auth and /post-auth would
// ping-pong forever on a stale JWT.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { sanitizeNextPath } from '@/lib/auth/redirect';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = sanitizeNextPath(url.searchParams.get('next'));

  const supabase = await createServerSupabase();
  try {
    await supabase.auth.signOut();
  } catch {
    /* best-effort */
  }

  // Belt-and-suspenders: explicitly expire any sb-* cookies that
  // signOut() may have missed (older SDKs, partial state).
  const res = NextResponse.redirect(`${url.origin}${next}`);
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      res.cookies.set({ name: cookie.name, value: '', path: '/', maxAge: 0 });
    }
  }
  return res;
}
