import { readOnboardingToken } from '@/lib/auth/onboarding';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonOk, jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const token = await readOnboardingToken();
    if (!token || token.userId !== auth.authUser.id) {
      return jsonOk({ requestId: null, payload: null });
    }
    return jsonOk({
      requestId: token.requestId,
      payload: token.payload,
    });
  } catch (error) {
    return jsonServerError(error);
  }
}
