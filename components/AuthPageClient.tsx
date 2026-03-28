'use client';

import { useEffect } from 'react';

export default function AuthPageClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');

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

