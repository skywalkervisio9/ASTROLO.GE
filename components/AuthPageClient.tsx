'use client';

import { useEffect } from 'react';

export default function AuthPageClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const err = params.get('error');
    const invite = params.get('invite');

    // Invite-link arrival: flip a body attribute that reveals the inline
    // .auth-invite-hero block at the top of the auth-card (see globals.css).
    // English visitors get translated copy injected over the KA defaults.
    if (invite) {
      document.body.setAttribute('data-invite-arrival', 'true');
      const isEn = !(document.documentElement.lang || 'ka').startsWith('ka');
      if (isEn) {
        const eyebrow = document.querySelector('.auth-invite-hero-eyebrow-text');
        const title = document.querySelector('.auth-invite-hero-title');
        const sub = document.querySelector('.auth-invite-hero-sub');
        if (eyebrow) eyebrow.textContent = 'invitation · synastry';
        if (title) title.textContent = "You've been invited to a synastry reading";
        if (sub) sub.textContent = 'Sign up or sign in';
      }
      const hero = document.getElementById('authInviteHero');
      if (hero) hero.setAttribute('aria-hidden', 'false');
    }

    // Surface a "reading is private" banner when redirected here from /r/[slug].
    // Uses a one-shot toast injected into the auth view; dismisses on click.
    if (err === 'private') {
      const isKa = (document.documentElement.lang || 'ka').startsWith('ka');
      const msg = isKa
        ? 'ეს წაკითხვა პირადია. შედით, თუ ეს თქვენი წაკითხვაა, ან სთხოვეთ ავტორს ბმული.'
        : 'This reading is private. Sign in if you’re the owner, or ask the author for the link.';
      const banner = document.createElement('div');
      banner.className = 'auth-private-banner';
      banner.setAttribute('role', 'alert');
      banner.textContent = msg;
      banner.style.cssText =
        'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
        'z-index:9999;padding:12px 20px;border-radius:10px;' +
        'background:rgba(245,217,138,0.12);border:1px solid rgba(245,217,138,0.35);' +
        'color:#f5d98a;font-size:14px;max-width:560px;text-align:center;' +
        'backdrop-filter:blur(6px);box-shadow:0 6px 24px rgba(0,0,0,0.4);cursor:pointer';
      banner.onclick = () => banner.remove();
      document.body.appendChild(banner);
      window.setTimeout(() => banner.remove(), 8000);
    }

    let attempts = 0;
    const maxAttempts = 30; // ~6s at 200ms interval

    // Restore the language the visitor last picked. Step transitions like
    // signup → /auth?step=birth do a full page reload, which would otherwise
    // reset to the KA default; setLang persists the choice to localStorage.
    let langRestored = false;
    const restoreLang = () => {
      const setLang = (window as unknown as Record<string, unknown>).setLang as
        | ((l: string, b: HTMLElement | null) => void)
        | undefined;
      if (!setLang) return false; // runtime not loaded yet — retry on next poll
      let saved: string | null = null;
      try { saved = localStorage.getItem('astrolo:lang'); } catch { /* private mode */ }
      if (saved === 'en') {
        const enBtn = document.querySelectorAll<HTMLElement>('.lg .lo')[1] ?? null;
        setLang('en', enBtn);
      }
      return true;
    };

    // Mirror showAuthPage('page-birth') + renderAuthSteps(3) with the DOM alone.
    // prototype-runtime.js loads afterInteractive, so on a fresh /auth?step=birth
    // load (post-signup) it isn't ready on the first pass. Without this, the
    // fallback below reveals the auth view while page-login is still the default
    // .active page — a ~1s flash of the login form before the runtime swaps in
    // the birth step. Pre-selecting birth here makes the first auth paint correct.
    const showBirthStepDom = () => {
      document.querySelectorAll('.auth-page').forEach((p) => p.classList.remove('active'));
      document.getElementById('page-birth')?.classList.add('active');
      for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('sd' + i);
        const line = document.getElementById('sl' + i);
        if (dot) dot.className = 'step-dot' + (i < 3 ? ' done' : '') + (i === 3 ? ' active' : '');
        if (line) line.className = 'step-line' + (3 > i ? ' done' : '');
      }
    };

    const applyAuthState = () => {
      if (!langRestored) langRestored = restoreLang();

      const w = window as unknown as Record<string, unknown>;
      const switchView = w.switchView as ((view: string, btn?: HTMLElement) => void) | undefined;
      const goAuthStep = w.goAuthStep as ((n: number) => void) | undefined;
      const showAuthPage = w.showAuthPage as ((id: string) => void) | undefined;

      if (switchView) {
        switchView('auth', document.getElementById('devAuth') as HTMLElement);
      } else {
        // Fallback while the runtime initializes. For the birth step, also
        // pre-select it in the DOM so we don't flash the default login page.
        document.body.setAttribute('data-view', 'auth');
        if (step === 'birth') showBirthStepDom();
      }

      if (step === 'birth' && goAuthStep && showAuthPage) {
        goAuthStep(2);
        showAuthPage('page-birth');
        return true;
      }

      // When no explicit step required, one pass is enough — but keep polling
      // until the runtime has loaded so the language restore above can run.
      if (step !== 'birth') return langRestored;

      return false;
    };

    if (applyAuthState()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (applyAuthState() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}

