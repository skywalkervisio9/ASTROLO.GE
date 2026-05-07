'use client';

// Client-side handoff so we use the same Supabase session as the browser.
// Server getUser() on /inv often misses cookies (localhost vs 127.0.0.1, timing),
// which skipped /post-auth?invite= and left users stuck on /r/ with no accept.

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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setNote(error.message);
      }
      const q = `invite=${encodeURIComponent(code)}`;
      if (session?.user) {
        window.location.replace(`/post-auth?${q}`);
      } else {
        window.location.replace(`/auth?${q}`);
      }
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
