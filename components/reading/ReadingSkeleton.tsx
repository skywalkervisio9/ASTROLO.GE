// ============================================================
// ReadingSkeleton — placeholder UI shown while a reading is being
// fetched / hydrated.
//
// Behavior:
//   - 200ms mount delay → cached/fast hits never flash a loader
//   - Portals into #readingSkeletonHost (the empty .ct div in BodyContent
//     where prototype-runtime later injects sections)
//   - Hides itself on the `reading:hydrated` event from prototype-runtime
//   - Also hides if hydration already happened before mount (window.__readingState)
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const MOUNT_DELAY_MS = 200;

export default function ReadingSkeleton() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // If hydration already fired before this component mounted, don't show.
    const w = window as unknown as { __readingState?: unknown };
    if (w.__readingState) return;

    let cancelled = false;
    const delay = setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById('readingSkeletonHost');
      if (!el) return;
      setHost(el);
      setVisible(true);
    }, MOUNT_DELAY_MS);

    const onHydrated = () => {
      cancelled = true;
      clearTimeout(delay);
      setVisible(false);
      // Allow the fade-out transition to finish before unmounting the portal.
      setTimeout(() => setHost(null), 250);
    };
    window.addEventListener('reading:hydrated', onHydrated);

    return () => {
      cancelled = true;
      clearTimeout(delay);
      window.removeEventListener('reading:hydrated', onHydrated);
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <div className={`reading-skel${visible ? ' reading-skel-in' : ''}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <section className="reading-skel-section" key={i}>
          <div className="reading-skel-bar reading-skel-title" />
          <div className="reading-skel-bar reading-skel-tagline" />
          <div className="reading-skel-grid">
            <div className="reading-skel-card">
              <div className="reading-skel-bar reading-skel-card-title" />
              <div className="reading-skel-bar reading-skel-card-line" />
              <div className="reading-skel-bar reading-skel-card-line" />
              <div className="reading-skel-bar reading-skel-card-line short" />
            </div>
            <div className="reading-skel-card">
              <div className="reading-skel-bar reading-skel-card-title" />
              <div className="reading-skel-bar reading-skel-card-line" />
              <div className="reading-skel-bar reading-skel-card-line" />
              <div className="reading-skel-bar reading-skel-card-line short" />
            </div>
          </div>
        </section>
      ))}
    </div>,
    host,
  );
}
