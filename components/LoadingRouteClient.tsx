'use client';

import { useEffect, useRef, useState } from 'react';
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
/**
 * Invitees land on their OWN natal reading, not the synastry view: their reading
 * is the thing they just waited for, so it leads. `?invited=1` opens the sidebar
 * onto the still-generating synastry slot (BodyContent) so the pending reading
 * is advertised without hijacking the page. The param also tells /r/[slug] not
 * to bounce them to /loading while Call 1 finishes in the background.
 */
function ownerReadingUrl(slug: string, fromInvite: boolean) {
  return fromInvite ? `/r/${slug}?invited=1` : `/r/${slug}`;
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
  // Premium user whose reading was never generated (status 'not_started').
  // Renders an explicit Generate action instead of spinning on watch-only polling.
  const [notStarted, setNotStarted] = useState(false);
  // Non-blocking notice while Call 2 auto-regenerates a thin language server-side
  // (see /api/onboarding/status `retrying`). Shows for 25s, then hides itself;
  // generation and polling continue underneath — no user action required.
  const [retryNotice, setRetryNotice] = useState(false);
  const [lang, setLang] = useState('ka');
  // Ensures the notice + bar-stretch fire at most once per page load even though
  // the marker stays fresh across several 5s polls.
  const retryHandledRef = useRef(false);

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

    // A status of 'not_started' is only ever returned for a PREMIUM user whose
    // paid full reading is missing and whose run either never stamped
    // generation_started_at or went stale (see computeOnboardingStatus). That is
    // never a terminal state we should dead-end on: the correct response is to
    // fire the idempotent generate-full run and keep watching. Older builds
    // surfaced the "hasn't been generated yet" prompt on the very first
    // not_started read, so it flashed spuriously on:
    //   • a fresh load / reload before the server wrote generation_started_at,
    //   • mobile lock→unlock (a poll-count grace burned through on visibility
    //     churn without real time passing),
    //   • a reopened tab (a manual dead-end where a re-fire would have healed it).
    // Fix: auto-fire generate-full ONCE, tolerate a wall-clock grace, and only
    // surface the manual prompt if generation still never starts after it — the
    // one case where the trigger genuinely keeps failing.
    const topMode = new URLSearchParams(window.location.search).get('mode');
    // Modes whose main flow fires the AI run itself — do NOT also auto-fire from
    // here (that could double-fire generate-full before the first run stamps
    // generation_started_at). We still apply the wall-clock grace for them.
    const didTriggerGeneration =
      topMode === 'generate-full' || topMode === 'regenerate-full' || topMode === 'regenerate-call1';
    const NOT_STARTED_GRACE_MS = 45_000; // wall-clock, robust to timer throttling
    let notStartedSince = 0;   // first consecutive not_started observation (epoch ms)
    let autoFiredFull = false; // generate-full fired at most once per page load

    const fireGenerateFullOnce = () => {
      if (autoFiredFull) return;
      autoFiredFull = true;
      // keepalive so the request survives tab teardown; not awaited — the server
      // run writes to the DB regardless of HTTP timing and the poll loop detects it.
      withCsrfHeaders({ method: 'POST', credentials: 'include', keepalive: true })
        .then((init) => {
          fetch('/api/reading/generate-full', init).catch((err) =>
            console.error('[loading] auto-recover generate-full network error (expected on long runs):', err)
          );
        })
        .catch(() => { /* csrf/header failure — the poll loop will retry via grace */ });
    };

    // Reset the grace clock whenever we see forward progress (queued/generating/
    // complete). The grace then measures CONSECUTIVE not_started time only, so a
    // run that starts, dies, and is re-fired each gets a fresh window instead of
    // inheriting a stale deadline.
    const noteProgress = () => { notStartedSince = 0; };

    // Server reported an in-flight auto-retry (a thin language being regenerated).
    // Flash the non-blocking notice for 25s and stretch the progress bar by the
    // retry's ETA — once per load. Never blocks: the poll loop keeps watching and
    // navigates the moment the run completes.
    const handleRetrySignal = (etaMs?: number) => {
      if (retryHandledRef.current) return;
      retryHandledRef.current = true;
      setRetryNotice(true);
      const w = window as unknown as { extendLoading?: (ms: number) => void };
      w.extendLoading?.(typeof etaMs === 'number' && etaMs > 0 ? etaMs : 230_000);
      window.setTimeout(() => setRetryNotice(false), 25_000);
    };

    /**
     * Called on every 'not_started' observation. Auto-fires the idempotent
     * generate-full (unless the caller's mode already fired it), then reports
     * whether the manual prompt should now be shown.
     * @returns true if the caller should stop (prompt shown); false to keep waiting.
     */
    const reportNotStarted = (): boolean => {
      const now = Date.now();
      if (notStartedSince === 0) notStartedSince = now;
      // In trigger modes the main flow already fired the run; here (plain load,
      // resume, reopened tab, or a stale/dead run) nothing did, so recover.
      if (!didTriggerGeneration) fireGenerateFullOnce();
      if (now - notStartedSince < NOT_STARTED_GRACE_MS) return false;
      setNotStarted(true);
      return true;
    };

    const checkOnVisible = async () => {
      if (document.visibilityState !== 'visible' || navigated) return;
      try {
        const res = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (!res.ok) return;
        const status = await res.json() as { status: string; complete?: boolean; shareSlug?: string; error?: string; retrying?: boolean; retryEtaMs?: number };
        if (status.status === 'failed') {
          const detail = status.error ? `: ${status.error.slice(0, 240)}` : '';
          setErrorText(`Generation failed${detail}`);
          setCanReturnToBirth(false);
          return;
        }
        if (status.retrying) handleRetrySignal(status.retryEtaMs);
        if (status.status === 'not_started') { reportNotStarted(); return; }
        // Any non-not_started status is forward progress — reset the grace clock
        // so a subsequent stale/dead state gets a fresh window rather than
        // tripping instantly on a deadline set before the tab was suspended.
        noteProgress();
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
          if (sess.profile?.language) { userLang = sess.profile.language; setLang(userLang); }
        }
      } catch { /* default to ka */ }

      whenRuntimeReady().then(() => {
        const fn = (window as unknown as Record<string, unknown>).startLoading as ((lang?: string, durationMs?: number) => void) | undefined;
        // 20s free (Astrologer API only), 60s fake-full (Call 1 only),
        // 30s invite (Astrologer API only — Call 1 + synastry finish in the
        //              background while the invitee reads their natal chart),
        // ~6.75min generate-full (full AI reading).
        const duration = isFree ? 20000
          : isFakeFull ? 60000
          : hasInvite && !isResume ? 30000
          : isRegenerateCall1 ? 120000   // DOB correction, invited tier — Call 1 only
          : 405000;                      // generate-full + resume — 6.75min, the measured
                                         // avg full-reading generation time (remaining time unknown)
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
      // Set when the early check finds a premium reading that was never started
      // (or went stale) on a non-trigger load: we auto-fire generate-full and
      // switch to watch-only so the poll loop below watches our recovery run
      // instead of falling through to chart/generate.
      let recoverToFull = false;
      if (!isFakeFull) {
        const earlyCheck = await fetch('/api/onboarding/status', { credentials: 'include' });
        if (earlyCheck.ok) {
          const earlyStatus = await earlyCheck.json() as { status: string; complete?: boolean; shareSlug?: string; startedAt?: number };
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
          // Premium user, no reading, nothing in flight (a plain reload before
          // generation_started_at was written, a post-payment/cross-device
          // landing, a reopened tab, or a stale/dead run). Instead of dead-ending
          // on the manual prompt — which flashed spuriously in exactly these
          // transient cases — auto-fire the idempotent full run and watch it. The
          // prompt only appears later if generation still never starts after the
          // wall-clock grace (reportNotStarted in the poll loop below). Trigger
          // modes already fire the run themselves, so they skip this.
          if (earlyStatus.status === 'not_started' && !isGenerateFull && !isRegenerate && !isFakeFull) {
            fireGenerateFullOnce();
            recoverToFull = true;
            // fall through to the polling loop (watch-only) — do NOT return.
          }
          if (earlyStatus.status === 'generating') {
            serverGenerating = true;
            // Mid-generation reload: resume the progress bar from the real
            // launch time instead of restarting at 0. startedAt is only present
            // while generating; rebaseLoading only ever moves the bar forward.
            if (typeof earlyStatus.startedAt === 'number') {
              const elapsed = Date.now() - earlyStatus.startedAt;
              whenRuntimeReady().then(() => {
                (window as unknown as { rebaseLoading?: (ms: number) => void }).rebaseLoading?.(elapsed);
              });
            }
          }
        }
      }

      // Watch-only: only poll + navigate, never re-fire chart/AI generation.
      // Explicit (re)generation modes are excluded — they are deliberate user
      // actions (post-payment full reading, DOB-correction regen) that must run
      // even when a partial row already exists.
      const watchOnly = isResume || recoverToFull || (serverGenerating && !isGenerateFull && !isRegenerate);

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
          if (isGenerateFull || isRegenerateFull) {
            // Full reading: a SINGLE request drives the whole run. generate-full
            // now runs Call 1 itself when analysis_en is missing, so there is no
            // client-side gap between Call 1 and Call 2 where a closed tab could
            // strand the reading half-generated. keepalive lets the request
            // survive tab teardown; not awaited because it runs up to 600s
            // server-side and writes to DB regardless of HTTP timing — the
            // polling loop below detects completion.
            withCsrfHeaders({ method: 'POST', credentials: 'include', keepalive: true }).then((init) => {
              fetch('/api/reading/generate-full', init).catch((err) =>
                console.error('[loading] generate-full network error (expected on long runs):', err)
              );
            });
          } else {
            // Invited-tier regen (isRegenerateCall1): Call 1 only — analysis_en is
            // their completion signal, no Call 2.
            const init1 = await withCsrfHeaders({ method: 'POST', credentials: 'include', keepalive: true });
            const res1 = await fetch('/api/reading/generate-call1', init1);
            if (!res1.ok) {
              const message = await res1.text();
              const trimmed = message.length > 240 ? message.slice(0, 240) + '…' : message;
              setErrorText(`Reading generation failed (${res1.status}): ${trimmed || 'no body'}`);
              console.error('[loading] generate-call1 failed', res1.status, message);
            }
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
        const status = await statusRes.json() as { status: string; complete?: boolean; readingId?: string | null; shareSlug?: string; error?: string; retrying?: boolean; retryEtaMs?: number };

        if (status.status === 'failed') {
          const detail = status.error ? `: ${status.error.slice(0, 240)}` : '';
          setErrorText(`Generation failed${detail}`);
          setCanReturnToBirth(false);
          return;
        }

        // In-flight server-side auto-retry — flash the non-blocking notice and
        // stretch the bar (once). Keep polling; this is not a terminal state.
        if (status.retrying) handleRetrySignal(status.retryEtaMs);

        // 'not_started' ⟹ premium reading that needs (re)generating. reportNotStarted
        // auto-fires the idempotent full run once and tolerates a wall-clock grace,
        // surfacing the manual prompt only if generation still never starts — so it
        // no longer flashes on fresh loads, mobile lock/unlock, or a reopened tab.
        if (status.status === 'not_started') {
          if (reportNotStarted()) return;
          continue;
        }

        // Forward progress (queued/generating) — reset the grace clock so the next
        // not_started (if the run dies and is re-fired) gets a fresh window.
        noteProgress();

        if (status.status === 'complete') {
          if (navigated) return;
          if (status.shareSlug) {
            // Accept invite synchronously, but don't block on synastry AI — it
            // finishes in the background while they read their natal chart, and
            // the sidebar's synastry slot reports its progress.
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

  if (notStarted) {
    // Nothing is generating and no reading exists. Offer an explicit action that
    // navigates to the mode which actually fires generate-full (Call 1 + Call 2).
    const startGeneration = () => { window.location.href = '/loading?mode=generate-full'; };
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
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#fde68a',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ flex: 1, lineHeight: 1.4 }}>Your reading hasn&apos;t been generated yet.</span>
        <button
          onClick={startGeneration}
          style={{ border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.12)', color: '#fde68a', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Generate reading
        </button>
      </div>
    );
  }

  if (errorText) {
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

  // Non-blocking, auto-dismissing (25s) notice shown while a thin language is
  // being regenerated server-side. Amber/info (not red/error) and button-less —
  // framed as extra polish, not a failure — because nothing needs the user to act.
  if (retryNotice) {
    const notice = lang === 'ka'
      ? 'ღრმა ანალიზი მიმდინარეობს — კიდევ ცოტა ხანი…'
      : 'Adding more depth to your reading — just a little longer…';
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          width: 'min(480px, calc(100vw - 32px))',
          background: 'rgba(7,10,20,0.92)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          color: '#fde68a',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ flex: 1, lineHeight: 1.4 }}>{notice}</span>
      </div>
    );
  }

  return null;
}
