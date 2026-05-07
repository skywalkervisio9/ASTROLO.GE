'use client';

/**
 * Polls synastry connections so the inviter's sidebar shows "generating…" while
 * the invitee runs /loading (and after) until reading_generated. Dispatches the
 * same window events as LoadingRouteClient / SynastryViewWrapper.
 */

import { useEffect, useRef } from 'react';

type Conn = {
  id: string;
  invitee_id: string | null;
  status: string;
  relationship_type: string;
  partner_name: string | null;
};

export default function SynastryConnectionSync() {
  const phaseRef = useRef<'idle' | 'generating' | 'ready'>('idle');
  const readyConnIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path === '/auth') return;

      try {
        const res = await fetch('/api/synastry/connections', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json() as { connections?: Conn[] };
        const conns = data.connections ?? [];
        const withPartner = conns.filter((c) => c.invitee_id);

        const done = withPartner.find((c) => c.status === 'reading_generated');
        if (done) {
          if (phaseRef.current === 'generating') {
            window.dispatchEvent(new CustomEvent('synastry-generation-ended', { detail: { ok: true } }));
          }
          phaseRef.current = 'ready';
          if (readyConnIdRef.current !== done.id) {
            readyConnIdRef.current = done.id;
            window.dispatchEvent(
              new CustomEvent('synastry-ready', {
                detail: {
                  connectionId: done.id,
                  relationshipType: done.relationship_type,
                  user2: { name: done.partner_name || 'Partner' },
                },
              }),
            );
          }
          return;
        }

        const active = withPartner.find(
          (c) => c.status === 'accepted' || c.status === 'pending',
        );
        if (!active) {
          if (phaseRef.current === 'generating') {
            window.dispatchEvent(new CustomEvent('synastry-generation-ended', { detail: { ok: false } }));
          }
          phaseRef.current = 'idle';
          readyConnIdRef.current = null;
          return;
        }

        const rr = await fetch(`/api/synastry/reading/${active.id}?lang=ka`, { credentials: 'include' });
        if (!rr.ok) return;
        const rd = await rr.json() as { reading?: unknown };
        if (rd.reading) {
          if (phaseRef.current === 'generating') {
            window.dispatchEvent(new CustomEvent('synastry-generation-ended', { detail: { ok: true } }));
          }
          phaseRef.current = 'ready';
          if (readyConnIdRef.current !== active.id) {
            readyConnIdRef.current = active.id;
            window.dispatchEvent(
              new CustomEvent('synastry-ready', {
                detail: {
                  connectionId: active.id,
                  relationshipType: active.relationship_type,
                  user2: { name: active.partner_name || 'Partner' },
                },
              }),
            );
          }
          return;
        }

        if (phaseRef.current !== 'generating') {
          window.dispatchEvent(new CustomEvent('synastry-generation-started'));
          phaseRef.current = 'generating';
        }
      } catch {
        /* ignore */
      }
    };

    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
