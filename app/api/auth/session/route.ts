import { getAuthContext } from '@/lib/auth/guards';
import { ensureUserProfileRow } from '@/lib/auth/profile';
import { jsonOk, jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const { supabase, authUser } = await getAuthContext();
    if (!authUser) {
      return jsonOk({ authUser: null, profile: null });
    }

    await ensureUserProfileRow({ user: authUser });
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    return jsonOk({
      authUser: { id: authUser.id, email: authUser.email ?? '' },
      profile: profile ?? null,
    });
  } catch (error) {
    return jsonServerError(error);
  }
}
