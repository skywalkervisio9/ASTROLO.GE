'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withCsrfHeaders } from '@/lib/auth/client';
import { whenRuntimeReady } from '@/lib/runtime-ready';
import type { GenerateChartRequest } from '@/types/api';
import type { Gender } from '@/types/user';

const LEGACY_LS_KEY = 'astrolo:lastGenerateRequest';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldReturnToBirth(status: number, message: string) {
  if (status === 400) return true;
  return /Missing birth data fields|Invalid|Unauthorized/i.test(message);
}

export default function LoadingRouteClient() {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [canReturnToBirth, setCanReturnToBirth] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const run = async () => {
      // Mark as live so prototype animation loops instead of auto-completing
      const w = window as unknown as Record<string, unknown>;
      w.__ASTROLO_LIVE_LOADING = true;

      // Fetch user's language preference for loading screen
      let userLang: string = 'ka';
      try {
        const langRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (langRes.ok) {
          const sess = await langRes.json() as { profile?: { language?: string } };
          if (sess.profile?.language) userLang = sess.profile.language;
        }
      } catch { /* default to ka */ }

      // Wait for prototype-runtime.js to load, then start the animation
      whenRuntimeReady().then(() => {
        const fn = (window as unknown as Record<string, unknown>).startLoading as ((lang?: string) => void) | undefined;
        if (fn) fn(userLang);
      });

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      // Check if reading already exists — redirect to public URL if so
      const earlyCheck = await fetch('/api/onboarding/status', { credentials: 'include' });
      if (earlyCheck.ok) {
        const earlyStatus = await earlyCheck.json() as { status: string; shareSlug?: string };
        if (earlyStatus.status === 'complete' && earlyStatus.shareSlug) {
          window.location.href = `/r/${earlyStatus.shareSlug}`;
          return;
        }
      }

      // Kick off generation if not already running/complete.
      // Prefer server-issued onboarding payload, then fallback to profile snapshot.
      let reqBody: GenerateChartRequest | null = null;
      const pendingRes = await fetch('/api/onboarding/pending', { credentials: 'include' });
      if (pendingRes.ok) {
        const pending = await pendingRes.json() as {
          requestId: string | null;
          payload: GenerateChartRequest | null;
        };
        reqBody = pending.payload;
      }
      if (!reqBody) {
        try {
          const raw = localStorage.getItem(LEGACY_LS_KEY);
          if (raw) reqBody = JSON.parse(raw) as GenerateChartRequest;
        } catch {
          reqBody = null;
        }
      }

      if (!reqBody) {
        const profRes = await fetch('/api/user/profile', { credentials: 'include' });
        if (profRes.ok) {
          const { profile } = await profRes.json() as { profile: Record<string, unknown> };
          const p = profile as Record<string, unknown>;
          reqBody = {
            name: (p.full_name as string | null) ?? (user.user_metadata?.full_name || user.user_metadata?.name || 'User'),
            birth_day: p.birth_day as number,
            birth_month: p.birth_month as number,
            birth_year: p.birth_year as number,
            birth_hour: (p.birth_hour as number | null) ?? null,
            birth_minute: (p.birth_minute as number | null) ?? null,
            birth_city: p.birth_city as string,
            birth_lat: p.birth_lat as number,
            birth_lng: p.birth_lng as number,
            birth_timezone: p.birth_timezone as string,
            gender: p.gender as Gender,
            invite_code: new URLSearchParams(window.location.search).get('invite') ?? undefined,
            free_section_pick: (p.free_section_pick as string | null) ?? undefined,
          } as GenerateChartRequest;
        }
      }

      // If we have complete data, call generate (idempotent)
      if (reqBody?.birth_day && reqBody?.birth_month && reqBody?.birth_year && reqBody?.birth_lat && reqBody?.birth_lng && reqBody?.birth_timezone && reqBody?.gender) {
        try {
          // Keep URL at /loading while this runs
          const init = await withCsrfHeaders({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(reqBody),
          });
          const generateRes = await fetch('/api/chart/generate', init);
          if (!generateRes.ok) {
            const message = await generateRes.text();
            console.error('[loading] chart generation request failed', generateRes.status, message);
            // Only return to birth for input/auth issues. Keep loading for transient
            // provider/server errors (429/5xx), so users don't lose flow.
            if (shouldReturnToBirth(generateRes.status, message)) {
              setErrorText('Birth data needs attention. Please review and submit again.');
              setCanReturnToBirth(true);
              return;
            }
            setErrorText('Reading generation is temporarily overloaded. Please wait and retry.');
            setCanReturnToBirth(false);
          }
        } catch {
          // Keep polling path, but show visible hint.
          setErrorText('Temporary network issue while starting generation. Retrying...');
          setCanReturnToBirth(false);
        }
      }

      // Poll until reading appears
      let attempts = 0;
      const maxAttempts = 120; // ~5 min at 2.5s interval
      for (;;) {
        attempts += 1;
        if (attempts > maxAttempts) {
          setErrorText('Generation timed out. You can retry or return to birth form.');
          setCanReturnToBirth(true);
          return;
        }
        await sleep(2500);
        const statusRes = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (!statusRes.ok) continue;
        const status = await statusRes.json() as { status: 'queued' | 'generating' | 'complete'; readingId: string | null; shareSlug?: string };
        if (status.status === 'complete') {
          // Save the user's free section pick before leaving loading
          const pick = (window as unknown as { _selectedFreePick?: string })._selectedFreePick;
          if (pick) {
            try {
              const pickInit = await withCsrfHeaders({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ sectionKey: pick }),
              });
              await fetch('/api/reading/section-pick', pickInit);
            } catch { /* best-effort — pick can be set later */ }
          }

          // Redirect to public reading URL
          if (status.shareSlug) {
            window.location.href = `/r/${status.shareSlug}`;
          } else {
            // Fallback: finish loading in-place
            const finish = (window as unknown as { finishLoading?: () => void }).finishLoading;
            if (finish) finish();
          }
          return;
        }
      }
    };

    run();
  }, []);

  const goBirth = () => {
    const invite = new URLSearchParams(window.location.search).get('invite');
    window.location.href = invite ? `/auth?step=birth&invite=${invite}` : '/auth?step=birth';
  };

  if (!errorText) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        width: 'min(480px, calc(100vw - 32px))',
        background: 'rgba(7,10,20,0.92)',
        border: '1px solid rgba(255,80,80,0.3)',
        borderRadius: 12,
        padding: '12px 16px',
        color: '#fecaca',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.4 }}>{errorText}</span>
      <button
        onClick={() => window.location.reload()}
        style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        Retry
      </button>
      {canReturnToBirth && (
        <button
          onClick={goBirth}
          style={{ border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.12)', color: '#fde68a', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Back to form
        </button>
      )}
    </div>
  );
}

