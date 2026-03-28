// ============================================================
// Supabase middleware — session refresh on every request
// Next.js 16 compatible
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PREFIXES = [
  '/auth',
  '/r/',   // public reading pages — accessible without login
  '/inv',
  '/api/auth/callback',
  '/api/auth/oauth/start',
  '/api/auth/csrf',
  '/api/invite/validate',
];

function isPublicRoute(path: string) {
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(path);
  if (path === '/') return true;
  if (hasFileExtension) return true;
  // API routes enforce auth/authorization at handler level.
  if (path.startsWith('/api/')) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Skip Supabase when env vars aren't configured (dev/prototype mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session — this keeps the auth token alive
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  const path = request.nextUrl.pathname;
  const isPublic = isPublicRoute(path);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return response;
}
