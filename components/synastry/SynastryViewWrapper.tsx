'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SynastryView from './SynastryView';
import type { SynastryReadingData, ChartPersonData } from './SynastryView';
import type { Language } from '@/types/user';
import { withCsrfHeaders } from '@/lib/auth/client';

interface Connection {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  relationship_type: 'couple' | 'friend';
  status: string;
  partner_name: string | null;
}

/**
 * SynastryViewWrapper — manages data fetching, dev triggers, and state.
 * Renders SynastryView when reading data is available.
 * Integrates with prototype-runtime.js via window events.
 */
export default function SynastryViewWrapper() {
  const [reading, setReading] = useState<SynastryReadingData | null>(null);
  const [chartA, setChartA] = useState<ChartPersonData | null>(null);
  const [chartB, setChartB] = useState<ChartPersonData | null>(null);
  const [shareSlugA, setShareSlugA] = useState<string | null>(null);
  const [shareSlugB, setShareSlugB] = useState<string | null>(null);
  const [synastryShareSlug, setSynastryShareSlug] = useState<string | null>(null);
  const [synastryIsPublic, setSynastryIsPublic] = useState(true);
  const [viewerIsInviter, setViewerIsInviter] = useState<boolean>(true);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language] = useState<Language>('ka');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoGenStartedRef = useRef(false);

  // Fetch connections on mount
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/synastry/connections', { credentials: 'include' });
      if (!res.ok) {
        console.warn('[synastry] /api/synastry/connections failed', res.status);
        return [];
      }
      const data = await res.json();
      const list = data.connections ?? [];
      setConnections(list);
      return list as Connection[];
    } catch {
      console.warn('[synastry] /api/synastry/connections network error');
    }
    return [];
  }, []);

  // Fetch a specific reading
  const fetchReading = useCallback(async (
    connectionId: string,
    lang: Language = 'ka',
    opts?: { quiet?: boolean },
  ) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/synastry/reading/${connectionId}?lang=${lang}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch reading');
      const data = await res.json();
      setActiveConnectionId(connectionId);
      if (data.reading) {
        setReading(data.reading);
        setChartA(data.chartA ?? null);
        setChartB(data.chartB ?? null);
        setShareSlugA(data.shareSlugA ?? null);
        setShareSlugB(data.shareSlugB ?? null);
        setSynastryShareSlug(data.synastryShareSlug ?? null);
        setSynastryIsPublic(data.synastryIsPublic !== false);
        setViewerIsInviter(data.viewerIsInviter !== false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load synastry reading');
    } finally {
      if (!opts?.quiet) {
        setLoading(false);
      }
    }
  }, []);

  // DEV-PANEL ONLY: trigger fake test synastry generation. Wired to the
  // dev panel's "occupy" button via the dev-trigger-synastry event — never
  // reachable from production sidebar UI.
  const triggerDevSynastry = useCallback(async () => {
    setGenerating(true);
    setGenProgress('Starting...');
    setError(null);

    try {
      const res = await fetch('/api/dev/test-synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-password': 'astrolo' },
        body: JSON.stringify({}),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            setGenProgress(msg.step || '');

            if (msg.status === 'done') {
              setGenerating(false);
              // Refresh connections and load the reading
              const conns = await fetchConnections();
              const generated = conns?.find((c: Connection) => c.status === 'reading_generated');
              if (generated) {
                await fetchReading(generated.id, language);
              }
              // Notify prototype-runtime.js
              window.dispatchEvent(new CustomEvent('synastry-ready', {
                detail: { connectionId: msg.connectionId, ...msg },
              }));
              return;
            }
            if (msg.status === 'error') {
              setError(msg.step);
              setGenerating(false);
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Stream ended without done/error — treat as failure
      setGenerating(false);
      setError('Generation stream ended unexpectedly');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGenerating(false);
    }
  }, [fetchConnections, fetchReading, language]);

  // Listen for synastry load requests from prototype-runtime.js
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.connectionId) {
        fetchReading(detail.connectionId, detail.language || 'ka');
      }
    };
    window.addEventListener('load-synastry', handler);
    return () => window.removeEventListener('load-synastry', handler);
  }, [fetchReading]);

  // Listen for dev-panel test synastry trigger from prototype-runtime.js
  useEffect(() => {
    const handler = () => { triggerDevSynastry(); };
    window.addEventListener('dev-trigger-synastry', handler);
    return () => window.removeEventListener('dev-trigger-synastry', handler);
  }, [triggerDevSynastry]);

  // Expose state to prototype-runtime.js
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__synastryState = {
      reading,
      connections,
      loading,
      generating,
      genProgress,
      error,
    };
  }, [reading, connections, loading, generating, genProgress, error]);

  // Poll for connection status while generating
  useEffect(() => {
    if (!generating) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const conns = await fetchConnections();
      const ready = conns?.find((c: Connection) => c.status === 'reading_generated');
      if (ready) {
        setGenerating(false);
        await fetchReading(ready.id, language);
      }
    }, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [generating, fetchConnections, fetchReading, language]);

  // Auto-load or generate on mount — accepted pairs often have no row yet (internal trigger missed).
  useEffect(() => {
    let cancelled = false;

    const dispatchReady = (c: Connection) => {
      window.dispatchEvent(new CustomEvent('synastry-ready', {
        detail: {
          connectionId: c.id,
          relationshipType: c.relationship_type,
          user2: { name: c.partner_name || 'Partner' },
        },
      }));
    };

    (async () => {
      let conns = await fetchConnections();
      for (let attempt = 0; attempt < 8 && !cancelled && conns.length === 0; attempt++) {
        await new Promise((r) => setTimeout(r, 600));
        conns = await fetchConnections();
      }
      if (cancelled || conns.length === 0) return;

      const withPartner = conns.filter((c) => c.invitee_id);
      const ready = withPartner.find((c) => c.status === 'reading_generated');
      if (ready) {
        await fetchReading(ready.id, language);
        dispatchReady(ready);
        return;
      }

      const needsGen = withPartner.find(
        (c) => c.invitee_id && (c.status === 'accepted' || c.status === 'pending'),
      );
      if (!needsGen || autoGenStartedRef.current) return;
      autoGenStartedRef.current = true;

      setLoading(true);
      try {
        const probe = await fetch(`/api/synastry/reading/${needsGen.id}?lang=${language}`, {
          credentials: 'include',
        });
        if (!probe.ok) {
          autoGenStartedRef.current = false;
          setLoading(false);
          setError(
            language === 'ka'
              ? `სინასტრიის ჩატვირთვა ვერ მოხერხდა (${probe.status})`
              : `Could not load synastry (${probe.status})`,
          );
          return;
        }
        const pdata = await probe.json() as { reading?: unknown };
        if (pdata.reading) {
          await fetchReading(needsGen.id, language, { quiet: true });
          dispatchReady(needsGen);
          return;
        }

        setLoading(false);
        setGenerating(true);
        setGenProgress(language === 'ka' ? 'სინასტრია იქმნება...' : 'Generating synastry…');

        window.dispatchEvent(new CustomEvent('synastry-generation-started'));
        let genOk = false;
        try {
          const startInit = await withCsrfHeaders({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ connection_id: needsGen.id }),
          });
          const startRes = await fetch('/api/synastry/start', startInit);
          genOk = startRes.ok;
          if (!startRes.ok) {
            let msg = await startRes.text();
            try {
              const j = JSON.parse(msg) as { error?: string };
              if (j.error) msg = j.error;
            } catch { /* plain text */ }
            setError(msg || `Synastry failed (${startRes.status})`);
            setGenerating(false);
            autoGenStartedRef.current = false;
            return;
          }

          await fetchReading(needsGen.id, language, { quiet: true });
          dispatchReady(needsGen);
        } finally {
          window.dispatchEvent(new CustomEvent('synastry-generation-ended', { detail: { ok: genOk } }));
        }
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
      autoGenStartedRef.current = false;
    };
  }, [fetchConnections, fetchReading, language]);

  const handleBackToNatal = () => {
    const btn = document.getElementById('devNatal');
    if (btn) {
      (window as unknown as Record<string, unknown> & { switchView?: (v: string, b: HTMLElement) => void }).switchView?.('natal', btn);
    }
  };

  // Open the prototype-runtime invite modal — the only path to fill an empty
  // synastry slot. Synastry never auto-populates with fake data anymore.
  const openInvite = () => {
    (window as unknown as { openInviteModal?: () => void }).openInviteModal?.();
  };

  // ── Render states ──

  // Has reading → show it
  if (reading) {
    return <SynastryView
      reading={reading}
      language={language}
      onBackToNatal={handleBackToNatal}
      chartA={chartA}
      chartB={chartB}
      shareSlugA={shareSlugA}
      shareSlugB={shareSlugB}
      synastryShareSlug={synastryShareSlug}
      synastryConnectionId={activeConnectionId}
      synastryIsPublic={synastryIsPublic}
      viewerIsInviter={viewerIsInviter}
    />;
  }

  // Generating → show progress
  if (generating) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="chero">
          <h1 style={{ color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '16px' }}>
            {language === 'ka' ? 'სინასტრია იქმნება...' : 'Generating synastry...'}
          </h1>
          <div className="tg" style={{ fontSize: '.9rem', opacity: 0.7 }}>{genProgress}</div>
          <div style={{ marginTop: '24px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', border: '2px solid var(--border)',
              borderTopColor: 'var(--gold)', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto',
            }} />
          </div>
        </div>
      </div>
    );
  }

  // Loading → spinner
  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{
          width: '32px', height: '32px', border: '2px solid var(--border)',
          borderTopColor: 'var(--gold)', borderRadius: '50%',
          animation: 'spin 1s linear infinite', margin: '0 auto',
        }} />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
      </div>
    );
  }

  // Empty state — invite CTA. The only way to fill a synastry slot is to send
  // an invite link and have a partner accept it.
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div className="chero">
        <h1 style={{ color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
          {language === 'ka' ? 'სინასტრია' : 'Synastry'}
        </h1>
        <div className="tg" style={{ fontSize: '.9rem', opacity: 0.6, marginBottom: '24px' }}>
          {language === 'ka'
            ? 'მოიწვიეთ პარტნიორი ან მეგობარი თავსებადობის ანალიზისთვის'
            : 'Invite a partner or friend for compatibility analysis'}
        </div>

        <button
          onClick={openInvite}
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,.2), rgba(201,168,76,.05))',
            border: '1px solid var(--gold)',
            color: 'var(--gold)',
            padding: '12px 28px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '.95rem',
            fontFamily: 'inherit',
          }}
        >
          {language === 'ka' ? 'მოიწვიე პარტნიორი' : 'Invite a partner'}
        </button>
      </div>
    </div>
  );
}
