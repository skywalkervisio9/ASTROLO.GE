// ============================================================
// GET /api/user/profile — Profile + tier
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { asEnum, asNonEmptyString } from '@/lib/auth/validators';
import { invalidateUserProfile } from '@/lib/data/public-reading';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const { data: profile, error } = await auth.supabase
      .from('users')
      .select('*')
      .eq('id', auth.authUser.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const body = await req.json() as { full_name?: string; language?: string };
    const patch: Record<string, unknown> = {};

    if (typeof body.full_name !== 'undefined') {
      const fullName = asNonEmptyString(body.full_name);
      if (!fullName) return jsonBadRequest('Invalid full_name');
      patch.full_name = fullName;
    }
    if (typeof body.language !== 'undefined') {
      const language = asEnum(body.language, ['ka', 'en'] as const);
      if (!language) return jsonBadRequest('Invalid language');
      patch.language = language;
    }
    if (Object.keys(patch).length === 0) return jsonBadRequest('No profile fields provided');

    const { error } = await auth.supabase
      .from('users')
      .update(patch)
      .eq('id', auth.authUser.id);
    if (error) throw error;

    // Bust the cached public-reading user block when display fields change.
    // language is a private preference — not in the public payload, skip.
    if ('full_name' in patch) invalidateUserProfile(auth.authUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonServerError(error);
  }
}

