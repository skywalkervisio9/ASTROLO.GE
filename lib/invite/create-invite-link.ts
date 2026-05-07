// ============================================================
// Client: create synastry invite via POST /api/invite/create
// ============================================================

import { withCsrfHeaders } from '@/lib/auth/client';

export type CreateInviteResult =
  | { ok: true; url: string; code?: string }
  | { ok: false; status: number; error: string; requires_payment?: boolean };

export async function createSynastryInviteLink(
  relationship_type: 'couple' | 'friend',
): Promise<CreateInviteResult> {
  const init = await withCsrfHeaders({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ relationship_type }),
  });
  const res = await fetch('/api/invite/create', init);
  const payload = await res.json().catch(() => ({})) as {
    url?: string;
    code?: string;
    requires_payment?: boolean;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error || `Invite generation failed (${res.status})`,
      requires_payment: payload.requires_payment,
    };
  }

  // Always use this tab’s origin so localhost ≠ wrong host in NEXT_PUBLIC_APP_URL.
  const url = payload.code
    ? `${window.location.origin}/inv/${payload.code}`
    : (payload.url || '');
  if (!url) {
    return { ok: false, status: res.status, error: 'Invite URL missing from response' };
  }

  return { ok: true, url, code: payload.code };
}
