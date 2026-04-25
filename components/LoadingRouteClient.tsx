'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withCsrfHeaders } from '@/lib/auth/client';
import { whenRuntimeReady } from '@/lib/runtime-ready';
import type { GenerateChartRequest } from '@/types/api';
import type { Gender } from '@/types/user';

const LEGACY_LS_KEY = 'astrolo:lastGenerateRequest';

// Free users: astrologer API only — quick (≤20s, 4 attempts at 5s).
// Invited & premium-generate-full: up to 7 min of polling at 5s intervals.
const FREE_MAX_ATTEMPTS = 4;   // 4 × 5s = 20s
const FULL_MAX_ATTEMPTS = 84;  // 84 × 5s = 7 min

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

    // Mobile browsers throttle/suspend background tabs, freezing the polling
    // loop. When the tab becomes visible again, force-check status so a
    // completed reading redirects immediately instead of waiting for the
    // (possibly stalled) loop to resume.
    let navigated = false;
    const checkOnVisible = async () => {
      if (document.visibilityState !== 'visible' || navigated) return;
      try {
        const res = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (!res.ok) return;
        const status = await res.json() as { status: string; complete?: boolean; shareSlug?: string; error?: string };
        if (status.status === 'failed') {
          const detail = status.error ? `: ${status.error.slice(0, 240)}` : '';
          setErrorText(`Generation failed${detail}`);
          setCanReturnToBirth(false);
          return;
        }
        if (status.status !== 'complete') return;
        navigated = true;
        if (status.shareSlug) {
          window.location.href = `/r/${status.shareSlug}`;
        } else {
          const finish = (window as unknown as { finishLoading?: () => void }).finishLoading;
          if (finish) finish();
        }
      } catch { /* ignore — polling loop will retry */ }
    };
    document.addEventListener('visibilitychange', checkOnVisible);

    const run = async () => {
      const w = window as unknown as Record<string, unknown>;
      w.__ASTROLO_LIVE_LOADING = true;

      // Detect mode from URL: ?mode=generate-full means post-payment full reading
      const urlParams = new URLSearchParams(window.location.search);
      const isGenerateFull = urlParams.get('mode') === 'generate-full';
      const hasInvite = Boolean(urlParams.get('invite'));
      const isFree = !isGenerateFull && !hasInvite;

      // Fetch user's language preference for loading screen
      let userLang: string = 'ka';
      try {
        const langRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (langRes.ok) {
          const sess = await langRes.json() as { profile?: { language?: string } };
          if (sess.profile?.language) userLang = sess.profile.language;
        }
      } catch { /* default to ka */ }

      whenRuntimeReady().then(() => {
        const fn = (window as unknown as Record<string, unknown>).startLoading as ((lang?: string, durationMs?: number) => void) | undefined;
        // 20s for free (Astrologer API only), 7 min for generate-full (AI reading)
        if (fn) fn(userLang, isFree ? 20000 : 420000);
      });

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      // Early exit: already complete
      const earlyCheck = await fetch('/api/onboarding/status', { credentials: 'include' });
      if (earlyCheck.ok) {
        const earlyStatus = await earlyCheck.json() as { status: string; complete?: boolean; shareSlug?: string };
        if (earlyStatus.status === 'complete' && earlyStatus.shareSlug) {
          window.location.href = `/r/${earlyStatus.shareSlug}`;
          return;
        }
      }

      // ── POST-PAYMENT MODE: trigger generate-full (two-step to stay within 300s) ──
      if (isGenerateFull) {
        try {
          // Step 1: Call 1 — chart analysis (idempotent, quick ~20-30s)
          const init1 = await withCsrfHeaders({ method: 'POST', credentials: 'include' });
          const res1 = await fetch('/api/reading/generate-call1', init1);
          if (!res1.ok) {
            const message = await res1.text();
            const trimmed = message.length > 240 ? message.slice(0, 240) + '…' : message;
            setErrorText(`Full reading generation failed (${res1.status}): ${trimmed || 'no body'}`);
            console.error('[loading] generate-call1 failed', res1.status, message);
          } else {
            // Step 2: fire generate-full without awaiting — it can run up to 300s on the
            // server and write to DB even if the HTTP connection drops before it responds.
            // Completion is detected entirely by the polling loop below.
            withCsrfHeaders({ method: 'POST', credentials: 'include' }).then((init2) => {
              fetch('/api/reading/generate-full', init2).catch((err) =>
                console.error('[loading] generate-full network error (expected on long runs):', err)
              );
            });
          }
        } catch {
          console.error('[loading] error starting full generation');
        }
        // Fall through to polling loop — it will detect DB completion regardless of HTTP timing
      } else {
        // ── INITIAL ONBOARDING: chart/generate ──
        let reqBody: GenerateChartRequest | null = null;

        const pendingRes = await fetch('/api/onboarding/pending', { credentials: 'include' });
        if (pendingRes.ok) {
          const pending = await pendingRes.json() as { requestId: string | null; payload: GenerateChartRequest | null };
          reqBody = pending.payload;
        }
        if (!reqBody) {
          try {
            const raw = localStorage.getItem(LEGACY_LS_KEY);
            if (raw) reqBody = JSON.parse(raw) as GenerateChartRequest;
          } catch { reqBody = null; }
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
              invite_code: urlParams.get('invite') ?? undefined,
            } as GenerateChartRequest;
          }
        }

        if (reqBody?.birth_day && reqBody?.birth_month && reqBody?.birth_year && reqBody?.birth_lat && reqBody?.birth_lng && reqBody?.birth_timezone && reqBody?.gender) {
          try {
            const init = await withCsrfHeaders({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(reqBody),
            });
            const generateRes = await fetch('/api/chart/generate', init);
            if (!generateRes.ok) {
              const message = await generateRes.text();
              console.error('[loading] chart generation failed', generateRes.status, message);
              if (shouldReturnToBirth(generateRes.status, message)) {
                setErrorText('Birth data needs attention. Please review and submit again.');
                setCanReturnToBirth(true);
                return;
              }
              setErrorText('Reading generation is temporarily overloaded. Please wait and retry.');
              setCanReturnToBirth(false);
            }
          } catch {
            setErrorText('Temporary network issue while starting generation. Retrying...');
            setCanReturnToBirth(false);
          }
        }
      }

      // ── POLLING LOOP ──
      // Free: max 20s (4 attempts × 5s). Invited/premium: max 5 min (80 attempts adaptive).
      const maxAttempts = isFree ? FREE_MAX_ATTEMPTS : FULL_MAX_ATTEMPTS;
      let attempts = 0;

      for (;;) {
        attempts += 1;
        if (attempts > maxAttempts) {
          setErrorText('Generation timed out. You can retry or return to birth form.');
          setCanReturnToBirth(true);
          return;
        }
        const interval = isFree ? 5000 : 5000;
        await sleep(interval);

        const statusRes = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (!statusRes.ok) continue;
        const status = await statusRes.json() as { status: string; complete?: boolean; readingId?: string | null; shareSlug?: string; error?: string };

        if (status.status === 'failed') {
          const detail = status.error ? `: ${status.error.slice(0, 240)}` : '';
          setErrorText(`Generation failed${detail}`);
          setCanReturnToBirth(false);
          return;
        }

        if (status.status === 'complete') {
          if (navigated) return;
          navigated = true;
          if (status.shareSlug) {
            window.location.href = `/r/${status.shareSlug}`;
          } else {
            const finish = (window as unknown as { finishLoading?: () => void }).finishLoading;
            if (finish) finish();
          }
          return;
        }
      }
    };

    run();

    return () => {
      document.removeEventListener('visibilitychange', checkOnVisible);
    };
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
