import { createServerSupabase } from '@/lib/supabase/server';
import { jsonUnauthorized } from '@/lib/auth/http';
import type { User } from '@/types/user';
import { authAudit } from '@/lib/auth/audit';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

type AuthContextUnauthorized = {
  supabase: ServerSupabase;
  authUser: null;
  response: Response;
};

type AuthContextAuthorized = {
  supabase: ServerSupabase;
  authUser: SupabaseAuthUser;
  response: null;
};

export async function getAuthContext() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, authUser: user };
}

export async function requireAuthContext(): Promise<AuthContextUnauthorized | AuthContextAuthorized> {
  const { supabase, authUser } = await getAuthContext();
  if (!authUser) {
    authAudit({ event: 'auth.required', outcome: 'denied' });
    return { response: jsonUnauthorized() as Response, supabase, authUser: null };
  }
  return { supabase, authUser, response: null };
}

export function requireOwnershipOrForbidden(ownerId: string, currentUserId: string) {
  if (ownerId !== currentUserId) {
    return jsonForbidden();
  }
  return null;
}

export async function getProfileOrNull(userId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data as User | null;
}
