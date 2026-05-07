// ============================================================
// /inv/[code] — Invite link entry (client session → post-auth or /auth)
// ============================================================

import InviteGate from './InviteGate';
import { normalizeInviteCode } from '@/lib/utils/invite';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalizeInviteCode(raw ?? '');
  if (!code) redirect('/auth');

  return <InviteGate rawCode={raw ?? ''} />;
}
