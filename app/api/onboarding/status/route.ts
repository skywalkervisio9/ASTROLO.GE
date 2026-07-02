// ============================================================
// GET /api/onboarding/status — Tier-aware completion check
//
// Thin wrapper around lib/onboarding/status.ts (shared with /post-auth and
// /r/[slug] so cross-device logins and reloads mid-generation route back to
// /loading). See computeOnboardingStatus for the per-tier rules.
// ============================================================

import { requireAuthContext } from '@/lib/auth/guards';
import { jsonOk, jsonServerError } from '@/lib/auth/http';
import { computeOnboardingStatus } from '@/lib/onboarding/status';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const result = await computeOnboardingStatus(auth.authUser.id);
    return jsonOk(result);
  } catch (error) {
    return jsonServerError(error);
  }
}
