import { NextRequest } from 'next/server';
import { requireAuthContext } from '@/lib/auth/guards';
import { issueOnboardingToken } from '@/lib/auth/onboarding';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';
import type { GenerateChartRequest } from '@/types/api';

function validateGeneratePayload(body: GenerateChartRequest) {
  const missing: string[] = [];
  if (!body.name) missing.push('name');
  if (!body.birth_day) missing.push('birth_day');
  if (!body.birth_month) missing.push('birth_month');
  if (!body.birth_year) missing.push('birth_year');
  if (!body.birth_city) missing.push('birth_city');
  if (typeof body.birth_lat !== 'number') missing.push('birth_lat');
  if (typeof body.birth_lng !== 'number') missing.push('birth_lng');
  if (!body.birth_timezone) missing.push('birth_timezone');
  if (!body.gender) missing.push('gender');
  return missing;
}

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const body = await req.json() as GenerateChartRequest;
    const missing = validateGeneratePayload(body);
    if (missing.length > 0) {
      return jsonBadRequest('Missing birth data fields', { missingFields: missing });
    }

    const requestId = await issueOnboardingToken(auth.authUser.id, body);
    return jsonOk({ requestId, status: 'queued' });
  } catch (error) {
    return jsonServerError(error);
  }
}
