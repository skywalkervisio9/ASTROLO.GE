// ============================================================
// Fire-and-forget POST to /api/synastry/generate when both
// participants have Call 1 (analysis_en). Safe to call repeatedly:
// synastry/generate no-ops if status is already reading_generated.
// ============================================================

import { createAdminSupabase } from '@/lib/supabase/admin';

function internalBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  );
}

/** If connection is accepted and both users have analysis_en, trigger synastry AI job. */
export async function tryTriggerSynastryForConnection(connectionId: string): Promise<void> {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    console.warn('[synastry/trigger] INTERNAL_SECRET missing — skipping synastry kick');
    return;
  }

  const admin = createAdminSupabase();
  const { data: conn } = await admin
    .from('synastry_connections')
    .select('id, status, inviter_id, invitee_id')
    .eq('id', connectionId)
    .maybeSingle();

  if (!conn?.invitee_id || conn.status === 'reading_generated') return;
  if (conn.status !== 'accepted') return;

  const [{ data: inviterReading }, { data: inviteeReading }] = await Promise.all([
    admin.from('natal_readings').select('analysis_en').eq('user_id', conn.inviter_id).maybeSingle(),
    admin.from('natal_readings').select('analysis_en').eq('user_id', conn.invitee_id).maybeSingle(),
  ]);

  if (!inviterReading?.analysis_en || !inviteeReading?.analysis_en) return;

  const baseUrl = internalBaseUrl();
  fetch(`${baseUrl.replace(/\/$/, '')}/api/synastry/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify({ connection_id: connectionId }),
  }).catch((err) => console.error('[synastry/trigger] fetch failed:', err));
}

/** After a user finishes Call 1, retry any accepted synastry pair they're in. */
export async function tryTriggerSynastryForUserConnections(userId: string): Promise<void> {
  const admin = createAdminSupabase();
  const { data: rows } = await admin
    .from('synastry_connections')
    .select('id')
    .eq('status', 'accepted')
    .not('invitee_id', 'is', null)
    .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`);

  for (const row of rows ?? []) {
    await tryTriggerSynastryForConnection(row.id as string);
  }
}
