// ============================================================
// POST /api/auth/signout
//
// Used by /inv/[code] to drop SSR cookies before bouncing the visitor to
// /auth?invite=…  Without this, the supabase-* cookies survive client-side
// signOut() long enough for the next page render to think the inviter is
// still logged in and redirect them to /loading.
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
