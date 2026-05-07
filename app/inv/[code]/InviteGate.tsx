'use client';

// Invite links always sign the visitor out before landing on /auth?invite=…
// so both new visitors and pre-logged-in users see the same intro UI and the
// inviter can never accept their own link by accident.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizeInviteCode } from '@/lib/utils/invite';

export default function InviteGate({ rawCode }: { rawCode: string }) {
  const [note, setNote] = useState('Opening invite…');

  useEffect(() => {
    const code = normalizeInviteCode(rawCode);
    if (!code) {
      window.location.replace('/auth');
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();

      // Server-side signout drops SSR cookies; client-side signout drops the
      // local session. Both are needed — without the server call, the next
      // page renders sees the supabase-* cookies and treats the inviter as
      // still authenticated, redirecting them to /loading.
      try {
        await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
      } catch { /* fall through — client signOut + AuthBridge defence still catches it */ }
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        if (!cancelled) setNote(e instanceof Error ? e.message : 'Sign-out failed');
      }

      // Brief verification loop — wait until getSession() reports null so we
      // never redirect mid-cookie-flush. Caps at ~1.5s.
      for (let i = 0; i < 15; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled) return;
      window.location.replace(`/auth?invite=${encodeURIComponent(code)}`);
    })();

    return () => { cancelled = true; };
  }, [rawCode]);

  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        textAlign: 'center',
        color: 'var(--gold, #c9a84c)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 15,
      }}
    >
      {note}
    </div>
  );
}
