'use client';

import { useEffect } from 'react';

export default function AuthPageClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const err = params.get('error');

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

    const applyAuthState = () => {
      const w = window as unknown as Record<string, unknown>;
      const switchView = w.switchView as ((view: string, btn?: HTMLElement) => void) | undefined;
      const goAuthStep = w.goAuthStep as ((n: number) => void) | undefined;
      const showAuthPage = w.showAuthPage as ((id: string) => void) | undefined;

      if (switchView) {
        switchView('auth', document.getElementById('devAuth') as HTMLElement);
      } else {
        // Fallback while runtime initializes
        document.body.setAttribute('data-view', 'auth');
      }

      if (step === 'birth' && goAuthStep && showAuthPage) {
        goAuthStep(2);
        showAuthPage('page-birth');
        return true;
      }

      // When no explicit step required, one pass is enough.
      if (step !== 'birth') return true;

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

