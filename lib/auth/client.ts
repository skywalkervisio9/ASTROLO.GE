const CSRF_HEADER = 'x-csrf-token';

let csrfTokenCache: string | null = null;

export async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Failed to obtain CSRF token');
  }
  const data = await res.json() as { csrfToken: string };
  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

export async function withCsrfHeaders(init?: RequestInit) {
  const token = await getCsrfToken();
  const headers = new Headers(init?.headers ?? {});
  headers.set(CSRF_HEADER, token);
  return { ...init, headers };
}
