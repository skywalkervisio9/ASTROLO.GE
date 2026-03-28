// ============================================================
// PATCH /api/user/language — Update language preference
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { asEnum } from '@/lib/auth/validators';

export async function PATCH(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const { language } = await req.json();
    const validatedLanguage = asEnum(language, ['ka', 'en'] as const);
    if (!validatedLanguage) {
      return jsonBadRequest('Invalid language');
    }

    const { error } = await auth.supabase
      .from('users')
      .update({ language: validatedLanguage })
      .eq('id', auth.authUser.id);

    if (error) throw error;

    return NextResponse.json({ success: true, language: validatedLanguage });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
