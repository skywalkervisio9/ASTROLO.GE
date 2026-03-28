import { issueCsrfToken } from '@/lib/auth/csrf';
import { jsonOk, jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const token = await issueCsrfToken();
    return jsonOk({ csrfToken: token });
  } catch (error) {
    return jsonServerError(error, 'Failed to issue csrf token');
  }
}
