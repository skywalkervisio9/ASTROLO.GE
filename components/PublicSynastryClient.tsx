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
import { initReadingStarfield } from '@/lib/utils/reading-starfield';

type Props = {
  slug: string;
  viewerIsParticipant: boolean;
};

export default function PublicSynastryClient({ slug, viewerIsParticipant }: Props) {
  const [language, setLanguage] = useState<Language>('ka');
  const [symbolMode, setSymbolMode] = useState(false); // false = names; the toggle starts OFF
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

  // Carry the current language onto the share link so the crawler picks the
  // matching KA/EN thumbnail (?lang=); metadata falls back to the owner's
  // account language when the param is absent.
  const shareHref = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/s/${slug}?lang=${language}` : ''),
    [slug, language],
  );

  useEffect(() => {
    document.title =
      reading?.meta && language === 'ka'
        ? 'ASTROLO.GE — სინასტრია'
        : reading?.meta
          ? 'ASTROLO.GE — Synastry'
          : 'ASTROLO.GE';
  }, [reading, language]);

  useEffect(() => {
    document.body.classList.toggle('zodiac-names', !symbolMode);
    return () => document.body.classList.remove('zodiac-names');
  }, [symbolMode]);

  // Starfield with scroll parallax + trails, identical to the individual reading.
  useEffect(() => initReadingStarfield(document.getElementById('public-stars')), [reading]);

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

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareHref); } catch { prompt('Copy link:', shareHref); }
  };

  return (
    <div>
      <div className="stars" id="public-stars" />
      <GlyphDefs />

      {/* Real webapp top bar (.tb) — logo, language + zodiac toggles */}
      <nav className="tb">
        <a className="tbl" href="/" aria-label="ASTROLO.GE">
          <span className="lm"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#gl-sparkle" /></svg></span>
          <span className="lt">ASTROLO<span className="lt-ge"><span className="lt-dot">.</span>GE</span></span>
        </a>
        <div className="tbr">
          <div className="lg">
            <button className={`lo${language === 'ka' ? ' active' : ''}`} onClick={() => setLanguage('ka')}>ქარ</button>
            <button className={`lo${language === 'en' ? ' active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
          </div>
          <div className="zt" aria-label="Zodiac display">
            <button className={`zo${symbolMode ? ' active' : ''}`} data-zodiac-mode="icon" title="Zodiac icons" onClick={() => setSymbolMode(true)}><svg aria-hidden="true"><use href="#gl-sparkle" /></svg></button>
            <button className={`zo${!symbolMode ? ' active' : ''}`} data-zodiac-mode="name" title="Zodiac names" onClick={() => setSymbolMode(false)}><svg aria-hidden="true"><use href="#gl-text-lines" /></svg></button>
          </div>
          {viewerIsParticipant && (
            <button type="button" className="pb" title={language === 'ka' ? 'ბმულის კოპირება' : 'Copy link'} onClick={copyLink}>
              <span className="pa"><svg style={{ width: 13, height: 13, fill: 'var(--gold)' }} aria-hidden="true"><use href="#gl-share" /></svg></span>
            </button>
          )}
        </div>
      </nav>

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
