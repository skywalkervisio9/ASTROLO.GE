import { NextRequest } from 'next/server';
import { issueOauthStateCookie } from '@/lib/auth/oauth-state';
import { sanitizeNextPath } from '@/lib/auth/redirect';
import { asEnum } from '@/lib/auth/validators';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';

const PROVIDERS = ['google'] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { provider?: string; next?: string };
    const provider = asEnum(body.provider, PROVIDERS);
    if (!provider) return jsonBadRequest('Invalid provider');

    const nonce = await issueOauthStateCookie();
    const next = sanitizeNextPath(body.next);
    const redirectTo = `${new URL(req.url).origin}/api/auth/callback?next=${encodeURIComponent(next)}&state=${encodeURIComponent(nonce)}`;
    return jsonOk({ provider, redirectTo });
  } catch (error) {
    return jsonServerError(error, 'Failed to initialize oauth');
  }
}
