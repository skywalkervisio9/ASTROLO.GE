import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { GenerateChartRequest } from '@/types/api';

const ONBOARDING_COOKIE = 'astrolo_onboarding';
const ONBOARDING_TTL = 60 * 20;

type OnboardingPayload = {
  requestId: string;
  userId: string;
  exp: number;
  payload: GenerateChartRequest;
};

function getSecret() {
  return process.env.AUTH_FLOW_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dev-secret';
}

function sign(data: string) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function encode(payload: OnboardingPayload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decode(token: string): OnboardingPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OnboardingPayload;
    if (!parsed.requestId || !parsed.userId || !parsed.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export async function issueOnboardingToken(userId: string, payload: GenerateChartRequest) {
  const requestId = crypto.randomUUID();
  const token = encode({
    requestId,
    userId,
    payload,
    exp: nowSec() + ONBOARDING_TTL,
  });
  const cookieStore = await cookies();
  cookieStore.set({
    name: ONBOARDING_COOKIE,
    value: token,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: ONBOARDING_TTL,
  });
  return requestId;
}

export async function readOnboardingToken() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ONBOARDING_COOKIE)?.value;
  if (!raw) return null;
  const parsed = decode(raw);
  if (!parsed) return null;
  if (parsed.exp < nowSec()) return null;
  return parsed;
}

export async function clearOnboardingToken() {
  const cookieStore = await cookies();
  cookieStore.delete(ONBOARDING_COOKIE);
}
