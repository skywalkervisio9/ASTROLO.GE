// ============================================================
// POST /api/payment/promo — Promo code redemption
//
// Two codes are recognised:
//   "astrolo10" → ₾10 instead of ₾15 (preview-only; the existing pay flow
//                 still drives the bank redirect)
//   "lotus"     → comp unlock — sets account_type=premium and
//                 natal_chart_unlocked=true so the loading page can run
//                 generate-call1 + generate-full immediately
//
// The client must redirect to /loading?mode=generate-full after a 'unlock'
// response. We flip the user's tier server-side so the gate in
// hasFullReading() passes when the loading page fires the generation calls.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { invalidateUserProfile } from '@/lib/data/public-reading';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { authUser } = auth;

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';

    if (code === 'astrolo10') {
      // No tier change — the discount is reflected in the displayed price
      // and is honoured when the bank redirect is wired up.
      return NextResponse.json({ ok: true, action: 'discount', amount: 10 });
    }

    if (code === 'lotus') {
      const admin = createAdminSupabase();
      const { error } = await admin
        .from('users')
        .update({
          account_type: 'premium',
          natal_chart_unlocked: true,
        })
        .eq('id', authUser.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Profile is read through the cached helper — the next /api/auth/session
      // and /api/reading/natal calls would otherwise still see account_type='free'
      // and the loading page's hasFullReading gate would reject the generation.
      invalidateUserProfile(authUser.id);

      return NextResponse.json({ ok: true, action: 'unlock' });
    }

    return jsonBadRequest('Invalid promo code');
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
