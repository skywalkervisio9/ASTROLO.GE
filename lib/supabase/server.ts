// ============================================================
// Supabase server client — API routes & server components
// Next.js 16: cookies() is async — must await
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }

  const cookieStore = await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try { cookieStore.set({ name, value, ...options }); } catch { /* read-only context (Server Component) — safe to ignore */ }
        },
        remove(name: string, options: Record<string, unknown>) {
          try { cookieStore.set({ name, value: '', ...options }); } catch { /* read-only context (Server Component) — safe to ignore */ }
        },
      },
    }
  );
}
