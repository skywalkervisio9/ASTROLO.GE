import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { isCsrfEnforced } from '@/lib/auth/flags';

const CSRF_COOKIE = 'astrolo_csrf';
const CSRF_HEADER = 'x-csrf-token';

export async function issueCsrfToken() {
  const token = crypto.randomBytes(24).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set({
    name: CSRF_COOKIE,
    value: token,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    maxAge: 60 * 60 * 8,
  });
  return token;
}

export async function requireCsrfOrThrow() {
  if (!isCsrfEnforced()) return;

  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = headerStore.get(CSRF_HEADER);
  if (!cookieToken || !headerToken) {
    throw new Error('CSRF token required');
  }
  if (cookieToken.length !== headerToken.length) {
    throw new Error('Invalid CSRF token');
  }
  const equal = crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!equal) {
    throw new Error('Invalid CSRF token');
  }
}

export function csrfHeaderName() {
  return CSRF_HEADER;
}
