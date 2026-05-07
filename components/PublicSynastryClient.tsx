'use client';

// ============================================================
// Guest/public synastry share page (/s/[slug]). Uses SynastryView.
// ============================================================

import SynastryView from '@/components/synastry/SynastryView';
import GlyphDefs from '@/components/svg/GlyphDefs';
import type {
  SynastryReadingData,
  ChartPersonData,
} from '@/components/synastry/SynastryView';
import type { SynastryShareUsers } from '@/lib/data/public-synastry';
import type { Language } from '@/types/user';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  slug: string;
  viewerIsParticipant: boolean;
};

export default function PublicSynastryClient({ slug, viewerIsParticipant }: Props) {
  const [language] = useState<Language>('ka');
  const [reading, setReading] = useState<SynastryReadingData | null>(null);
  const [chartA, setChartA] = useState<ChartPersonData | null>(null);
  const [chartB, setChartB] = useState<ChartPersonData | null>(null);
  const [users, setUsers] = useState<SynastryShareUsers | null>(null);
  const [slugA, setSlugA] = useState<string | null>(null);
  const [slugB, setSlugB] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/synastry/public?slug=${encodeURIComponent(slug)}&lang=${language}`,
        { credentials: 'include' },
      );
      if (res.status === 403) throw new Error('private');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        reading: SynastryReadingData;
        chartA?: ChartPersonData;
        chartB?: ChartPersonData;
        users: SynastryShareUsers;
        shareSlugA?: string | null;
        shareSlugB?: string | null;
        isPublic: boolean;
      };

      setReading(data.reading ?? null);
      setChartA((data.chartA as ChartPersonData) ?? null);
      setChartB((data.chartB as ChartPersonData) ?? null);
      setUsers(data.users ?? null);
      setSlugA(typeof data.shareSlugA === 'string' ? data.shareSlugA : null);
      setSlugB(typeof data.shareSlugB === 'string' ? data.shareSlugB : null);
    } catch {
      setError('failed');
    }
  }, [slug, language]);

  useEffect(() => {
    load();
    document.body.setAttribute('data-public-view', 'true');
    document.body.setAttribute('data-view', 'synastry');
    return () => {
      document.body.removeAttribute('data-public-view');
      document.body.setAttribute('data-view', 'natal');
    };
  }, [load]);

  const shareHref = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/s/${slug}` : ''),
    [slug],
  );

  useEffect(() => {
    document.title =
      reading?.meta && language === 'ka'
        ? 'ASTROLO.GE — სინასტრია'
        : reading?.meta
          ? 'ASTROLO.GE — Synastry'
          : 'ASTROLO.GE';
  }, [reading, language]);

  if (error) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <p style={{ color: '#ff6b6b' }}>
          {language === 'ka'
            ? 'ამ ბმულზე წვდომა შეზღუდულია ან ანალიზი ვერ მოიძებნა.'
            : 'This link is private or the reading was not found.'}
        </p>
      </div>
    );
  }

  if (!reading || !users) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div
          className="spinner"
          style={{
            width: 32,
            height: 32,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <GlyphDefs />
      {viewerIsParticipant && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 1000,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'flex-end',
            maxWidth: 'min(420px, 96vw)',
          }}
        >
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareHref);
              } catch {
                prompt('Copy link:', shareHref);
              }
            }}
            style={{
              background: 'rgba(201,168,76,.12)',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
          >
            {language === 'ka' ? 'ბმულის კოპირება' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
          >
            {language === 'ka' ? 'აპლიკაცია' : 'Open app'}
          </button>
        </div>
      )}
      <SynastryView
        reading={reading}
        language={language}
        chartA={chartA ?? undefined}
        chartB={chartB ?? undefined}
        shareSlugA={slugA ?? undefined}
        shareSlugB={slugB ?? undefined}
      />
    </div>
  );
}
