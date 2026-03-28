import { requireAuthContext } from '@/lib/auth/guards';
import { jsonOk, jsonServerError } from '@/lib/auth/http';

export async function GET() {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const userId = auth.authUser.id;
    const { data: reading } = await auth.supabase
      .from('natal_readings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (reading?.id) {
      return jsonOk({ status: 'complete', readingId: reading.id });
    }

    const { data: chart } = await auth.supabase
      .from('chart_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return jsonOk({
      status: chart?.id ? 'generating' : 'queued',
      readingId: null,
    });
  } catch (error) {
    return jsonServerError(error);
  }
}
