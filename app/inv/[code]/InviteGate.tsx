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
      try {
        await supabase.auth.signOut();
      } catch (e) {
        if (!cancelled) setNote(e instanceof Error ? e.message : 'Sign-out failed');
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
