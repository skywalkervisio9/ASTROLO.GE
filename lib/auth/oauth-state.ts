import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'astrolo_oauth_state';
const TTL_SECONDS = 60 * 10;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

type OauthStatePayload = {
  nonce: string;
  exp: number;
};

function encode(payload: OauthStatePayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decode(value: string): OauthStatePayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as OauthStatePayload;
    if (!parsed.nonce || typeof parsed.exp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function issueOauthStateCookie() {
  const nonce = crypto.randomUUID();
  const payload: OauthStatePayload = {
    nonce,
    exp: nowSeconds() + TTL_SECONDS,
  };
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: encode(payload),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
  return nonce;
}

export async function consumeOauthStateCookie(expectedNonce: string | null) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (!raw || !expectedNonce) return false;
  const parsed = decode(raw);
  if (!parsed) return false;
  if (parsed.exp < nowSeconds()) return false;
  if (parsed.nonce.length !== expectedNonce.length) return false;
  return crypto.timingSafeEqual(Buffer.from(parsed.nonce), Buffer.from(expectedNonce));
}
