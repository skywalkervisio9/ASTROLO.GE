// ============================================================
// /inv/[code] — Invite link redirect → auth with code attached
// ============================================================

import { redirect } from 'next/navigation';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/auth?invite=${code}`);
}
