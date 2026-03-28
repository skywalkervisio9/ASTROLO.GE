import { NextRequest } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { ensureUserProfileRow } from '@/lib/auth/profile';
import { asNonEmptyString } from '@/lib/auth/validators';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const body = await req.json() as { full_name?: string };
    const fullName = typeof body.full_name === 'undefined'
      ? undefined
      : asNonEmptyString(body.full_name);
    if (typeof body.full_name !== 'undefined' && !fullName) {
      return jsonBadRequest('Invalid full_name');
    }

    await ensureUserProfileRow({
      user: auth.authUser,
      fullNameOverride: fullName,
    });

    const { data: profile } = await auth.supabase
      .from('users')
      .select('*')
      .eq('id', auth.authUser.id)
      .maybeSingle();

    return jsonOk({ profile: profile ?? null });
  } catch (error) {
    return jsonServerError(error);
  }
}
