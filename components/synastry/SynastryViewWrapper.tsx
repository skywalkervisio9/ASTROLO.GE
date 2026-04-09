'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SynastryView from './SynastryView';
import type { SynastryReadingData } from './SynastryView';
import type { Language } from '@/types/user';

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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language] = useState<Language>('ka');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch connections on mount
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/synastry/connections', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections ?? []);
      return data.connections ?? [];
    } catch {
      // Not logged in or no connections
    }
    return [];
  }, []);

  // Fetch a specific reading
  const fetchReading = useCallback(async (connectionId: string, lang: Language = 'ka') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/synastry/reading/${connectionId}?lang=${lang}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch reading');
      const data = await res.json();
      if (data.reading) {
        setReading(data.reading);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load synastry reading');
    } finally {
      setLoading(false);
    }
  }, []);

  // Dev: trigger test synastry generation
  const triggerDevSynastry = useCallback(async () => {
    setGenerating(true);
    setGenProgress('Starting...');
    setError(null);

    try {
      const res = await fetch('/api/dev/test-synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Listen for dev trigger from prototype-runtime.js
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

  // Auto-load reading on mount if one exists
  useEffect(() => {
    fetchConnections().then((conns) => {
      const ready = conns?.find((c: Connection) => c.status === 'reading_generated');
      if (ready) fetchReading(ready.id, language);
    });
  }, [fetchConnections, fetchReading, language]);

  // Must be state + useEffect to avoid SSR hydration mismatch
  const [isDev, setIsDev] = useState(false);
  useEffect(() => {
    setIsDev(window.location.hostname === 'localhost');
  }, []);

  const handleBackToNatal = () => {
    const btn = document.getElementById('devNatal');
    if (btn) {
      (window as unknown as Record<string, unknown> & { switchView?: (v: string, b: HTMLElement) => void }).switchView?.('natal', btn);
    }
  };

  // ── Render states ──

  // Has reading → show it
  if (reading) {
    return <SynastryView reading={reading} language={language} onBackToNatal={handleBackToNatal} />;
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
        {isDev && (
          <button
            className="bb"
            style={{ color: 'var(--gold)', border: '1px solid var(--gold)', padding: '8px 20px', borderRadius: '8px' }}
            onClick={triggerDevSynastry}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Empty state — dev button or invite CTA
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

        {isDev && (
          <button
            onClick={triggerDevSynastry}
            disabled={generating}
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
            ⚡ Dev: Generate Test Synastry
          </button>
        )}
      </div>
    </div>
  );
}
