'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withCsrfHeaders } from '@/lib/auth/client';
import { whenRuntimeReady } from '@/lib/runtime-ready';
import { normalizeInviteCode } from '@/lib/utils/invite';
import type { GenerateChartRequest } from '@/types/api';
import type { Gender } from '@/types/user';

const LEGACY_LS_KEY = 'astrolo:lastGenerateRequest';

// Free users: astrologer API only — quick (≤20s, 4 attempts at 5s).
// Invited & premium-generate-full: up to 7 min of polling at 5s intervals.
const FREE_MAX_ATTEMPTS = 4;   // 4 × 5s = 20s
const FULL_MAX_ATTEMPTS = 180;  // 84 × 5s = 7 min -- 180 -changed to approx. 15min

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldReturnToBirth(status: number, message: string) {
  if (status === 400) return true;
  return /Missing birth data fields|Invalid|Unauthorized/i.test(message);
}

/** Existing onboarded users skip chart/generate — synastry invite is accepted here. Idempotent (409 ok). */
function ownerReadingUrl(slug: string, focusSynastry: boolean) {
  return focusSynastry ? `/r/${slug}?synastry=1` : `/r/${slug}`;
}

async function postInviteAcceptFromLoading(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;
  try {
    const acceptInit = await withCsrfHeaders({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: normalizeInviteCode(code) }),
    });
    const acceptRes = await fetch('/api/invite/accept', acceptInit);
    const payload = await acceptRes.json().catch(() => ({})) as { connection_id?: string; error?: string };
    if (!acceptRes.ok && acceptRes.status !== 409) {
      const detail = payload.error ?? '';
      console.warn('[loading] invite/accept failed', acceptRes.status, detail);
    }
    return payload.connection_id ?? null;
  } catch (e) {
    console.warn('[loading] invite/accept error', e);
    return null;
  }
}


export default function LoadingRouteClient() {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [canReturnToBirth, setCanReturnToBirth] = useState(false);

  // Lock body scroll while the loading overlay is mounted. The /loading page
  // also renders BodyContent (the full app shell) so the document is taller
  // than the viewport — without this lock the user can scroll the hidden
  // shell out from behind the overlay and see a stray scrollbar.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

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
        const invTab = new URLSearchParams(window.location.search).get('invite');
        // complete but slug not written yet (e.g. ensureShareSlug lag) — never finishLoading on invite flow
        if (!status.shareSlug) {
          if (invTab) return;
          navigated = true;
          const finish = (window as unknown as { finishLoading?: () => void }).finishLoading;
          if (finish) finish();
          return;
        }
        if (invTab) {
          // Accept invite, then hand off to the synastry view's cosmic loader.
          await postInviteAcceptFromLoading(invTab);
        }
        navigated = true;
        window.location.href = ownerReadingUrl(status.shareSlug, Boolean(invTab));
      } catch { /* ignore — polling loop will retry */ }
    };
    document.addEventListener('visibilitychange', checkOnVisible);

    const run = async () => {
      const w = window as unknown as Record<string, unknown>;
      w.__ASTROLO_LIVE_LOADING = true;

      // Detect mode from URL: ?mode=generate-full means post-payment full reading;
      // ?mode=fake-full is the dev CALL1 PREMIUM path (real Call 1 + stub Call 2).
      const urlParams = new URLSearchParams(window.location.search);
      const isGenerateFull = urlParams.get('mode') === 'generate-full';
      // DOB correction: rebuild chart_data (wiped by the birth-data reset) THEN
      // re-run the tier's AI reading — full (Call 1 + Call 2) or invited (Call 1).
      const isRegenerateFull = urlParams.get('mode') === 'regenerate-full';
      const isRegenerateCall1 = urlParams.get('mode') === 'regenerate-call1';
      const isRegenerate = isRegenerateFull || isRegenerateCall1;
      const isFakeFull = urlParams.get('mode') === 'fake-full';
      // ?mode=resume: generation is already running somewhere (another device,
      // another tab, or a server run that outlived its tab) — watch + poll
      // only, never re-fire the AI calls, and use the long polling cap
      // regardless of tier. Set by /post-auth, /r/[slug] and AuthBridge when
      // onboarding status reports 'generating'.
      const isResume = urlParams.get('mode') === 'resume';
      const inviteFromUrl = urlParams.get('invite');
      const hasInvite = Boolean(inviteFromUrl);
      const isFree = !isGenerateFull && !isRegenerate && !isFakeFull && !hasInvite && !isResume;

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
        // 20s free (Astrologer API only), 60s fake-full (Call 1 only),
        // 30s invite (Astrologer API only — Call 1 + synastry deferred to the
        //              synastry-view cosmic loader on /r/[slug]?synastry=1),
        // 6min generate-full (full AI reading).
        const duration = isFree ? 20000
          : isFakeFull ? 60000
          : hasInvite && !isResume ? 30000
          : isRegenerateCall1 ? 120000   // DOB correction, invited tier — Call 1 only
          : 360000;                      // generate-full + resume (remaining time unknown)
        if (fn) fn(userLang, duration);
      });

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      // Early exit: already complete. Skipped for fake-full — that mode is
      // explicitly a re-generation and must run regardless of existing rows.
      let serverGenerating = false;
      if (!isFakeFull) {
        const earlyCheck = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (earlyCheck.ok) {
          const earlyStatus = await earlyCheck.json() as { status: string; complete?: boolean; shareSlug?: string };
          if (earlyStatus.status === 'complete' && earlyStatus.shareSlug) {
            // Accept the invite synchronously so the connection exists, but
            // don't block on synastry AI here — the synastry view's cosmic
            // loader handles that wait with proper UI. Falls back to legacy
            // blocking behavior only if accept itself failed unexpectedly.
            await postInviteAcceptFromLoading(inviteFromUrl);
            navigated = true;
            window.location.href = ownerReadingUrl(earlyStatus.shareSlug, Boolean(inviteFromUrl));
            return;
          }
          // Generation is already in flight (a plain /loading reload, a
          // cross-device login, or a server run that outlived its tab). The
          // work is running — we must NOT re-fire it. `isResume` only gets set
          // when routing THROUGH / or /auth, so a direct reload of /loading
          // would otherwise fall into the initial-onboarding branch below and
          // re-generate against the 20s free cap → time out / stuck. Deriving
          // the watch-only decision from the server state instead of the URL
          // makes every re-entry converge on: wait for the in-flight run, then
          // navigate to the reading.
          if (earlyStatus.status === 'generating') serverGenerating = true;
        }
      }

      // Watch-only: only poll + navigate, never re-fire chart/AI generation.
      // Explicit (re)generation modes are excluded — they are deliberate user
      // actions (post-payment full reading, DOB-correction regen) that must run
      // even when a partial row already exists.
      const watchOnly = isResume || (serverGenerating && !isGenerateFull && !isRegenerate);

      // ── DEV CALL1 PREMIUM: real Call 1 + cloned Call 2 (no Call 2 spend) ──
      // Single round-trip — await the response and redirect with the returned
      // slug. Polling would race against the existing reading_ka and bounce
      // the user back to the previous slug before the dev route finishes.
      if (isFakeFull) {
        try {
          const init = await withCsrfHeaders({
            method: 'POST',
            credentials: 'include',
            headers: { 'x-dev-password': 'astrolo' },
          });
          const res = await fetch('/api/dev/generate-fake-full', init);
          if (!res.ok) {
            const message = await res.text();
            const trimmed = message.length > 240 ? message.slice(0, 240) + '…' : message;
            setErrorText(`CALL1 PREMIUM failed (${res.status}): ${trimmed || 'no body'}`);
            return;
          }
          const data = await res.json() as { shareSlug?: string };
          if (data.shareSlug) {
            window.location.href = `/r/${data.shareSlug}`;
            return;
          }
          setErrorText('CALL1 PREMIUM returned no shareSlug.');
          return;
        } catch (err) {
          console.error('[loading] generate-fake-full error:', err);
          setErrorText(`CALL1 PREMIUM error: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }
      }

      if (isRegenerate) {
        // Rebuild chart_data from the corrected birth data. The reset endpoint
        // deleted the old chart_data + queued the new payload (onboarding token),
        // so chart/generate re-hits the astrologer API instead of reusing cache.
        let reqBody: GenerateChartRequest | null = null;
        const pendingRes = await fetch('/api/onboarding/pending', { credentials: 'include' });
        if (pendingRes.ok) {
          const pending = await pendingRes.json() as { payload: GenerateChartRequest | null };
          reqBody = pending.payload;
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
            } as GenerateChartRequest;
          }
        }
        if (reqBody) {
          try {
            const init = await withCsrfHeaders({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(reqBody),
            });
            const r = await fetch('/api/chart/generate', init);
            if (!r.ok) {
              const message = await r.text();
              setErrorText(`Reading regeneration failed (${r.status}): ${message.slice(0, 200) || 'no body'}`);
              setCanReturnToBirth(false);
              return;
            }
          } catch {
            setErrorText('Network issue while rebuilding chart. Please retry.');
            return;
          }
        }
      }

      if (isGenerateFull || isRegenerate) {
        try {
          // Step 1: Call 1 — chart analysis. Required for invited (completes their
          // partial reading) and as the prerequisite for the full reading.
          const init1 = await withCsrfHeaders({ method: 'POST', credentials: 'include' });
          const res1 = await fetch('/api/reading/generate-call1', init1);
          if (!res1.ok) {
            const message = await res1.text();
            const trimmed = message.length > 240 ? message.slice(0, 240) + '…' : message;
            setErrorText(`Reading generation failed (${res1.status}): ${trimmed || 'no body'}`);
            console.error('[loading] generate-call1 failed', res1.status, message);
          } else if (isGenerateFull || isRegenerateFull) {
            // Step 2 (full tiers only): fire generate-full without awaiting — it can run
            // up to 300s on the server and write to DB even if the HTTP connection drops
            // before it responds. Completion is detected by the polling loop below.
            // (Invited regen stops after Call 1 — analysis_en is their completion signal.)
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
      } else if (!watchOnly) {
        // ── INITIAL ONBOARDING: chart/generate ── (skipped in watch-only mode:
        // the work is already running elsewhere, we only watch and poll)
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
            } else if (hasInvite) {
              // Invited path: chart/generate returns as soon as the astrologer
              // API completes + invite is accepted. Call 1 + synastry are
              // running in the background — the synastry view's cosmic loader
              // takes over from here, so we redirect immediately instead of
              // polling for analysis_en (which would re-add the long wait).
              const data = await generateRes.json().catch(() => null) as { shareSlug?: string } | null;
              if (data?.shareSlug) {
                navigated = true;
                window.location.href = ownerReadingUrl(data.shareSlug, true);
                return;
              }
              // Fall through to polling if the response didn't include a slug —
              // legacy clients or transient errors. Polling still works because
              // /api/onboarding/status will eventually report complete.
            }
          } catch {
            setErrorText('Temporary network issue while starting generation. Retrying...');
            setCanReturnToBirth(false);
          }
        }
      }

      // ── POLLING LOOP ──
      // Free: max 20s (4 attempts × 5s). Invited/premium: max 5 min (80 attempts adaptive).
      // Watch-only re-entry (reload / cross-device / crash recovery) always uses
      // the long cap — remaining generation time is unknown and the short free
      // cap would time out an in-flight run that's simply not done yet.
      const maxAttempts = isFree && !watchOnly ? FREE_MAX_ATTEMPTS : FULL_MAX_ATTEMPTS;
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
          if (status.shareSlug) {
            // Accept invite synchronously, but don't block on synastry AI —
            // the synastry view's cosmic loader takes over on /r/[slug]?synastry=1.
            await postInviteAcceptFromLoading(inviteFromUrl);
            navigated = true;
            window.location.href = ownerReadingUrl(status.shareSlug, Boolean(inviteFromUrl));
            return;
          }
          // status.complete with no shareSlug used to fall through to a
          // client-side `finishLoading()`, which left the URL on /loading
          // and the natal view un-hydrated. Keep polling instead — the
          // slug is written by chart/generate and should appear shortly.
          continue;
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
