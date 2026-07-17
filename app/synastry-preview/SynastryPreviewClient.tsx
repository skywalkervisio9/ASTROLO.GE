'use client';

// ============================================================
// Dev preview — renders SynastryView with a sample (or ?connection=
// real) reading, PLUS a faithful chrome: header (logo, symbol/text
// toggle, language toggle) + the global starfield, so it matches the
// individual reading experience. Not linked from production UI.
// ============================================================

import { useEffect, useState } from 'react';
import SynastryView from '@/components/synastry/SynastryView';
import GlyphDefs from '@/components/svg/GlyphDefs';
import type { Language } from '@/types/user';
import type { SynastryReadingData, ChartPersonData } from '@/components/synastry/SynastryView';
import { SAMPLE_READING, SAMPLE_CHART_A, SAMPLE_CHART_B } from './sample';
import { initReadingStarfield } from '@/lib/utils/reading-starfield';

export default function SynastryPreviewClient() {
  const [language, setLanguage] = useState<Language>('en');
  const [symbolMode, setSymbolMode] = useState(false); // true = glyphs, false = names; starts OFF
  const [real, setReal] = useState<{
    reading: SynastryReadingData; chartA: ChartPersonData | null; chartB: ChartPersonData | null;
  } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-view', 'synastry');
    document.body.classList.toggle('lang-en', language === 'en');
    return () => { document.body.setAttribute('data-view', 'natal'); };
  }, [language]);

  useEffect(() => {
    document.body.classList.toggle('zodiac-names', !symbolMode);
    return () => { document.body.classList.remove('zodiac-names'); };
  }, [symbolMode]);

  // Starfield with scroll parallax + trails, identical to the individual reading.
  useEffect(() => initReadingStarfield(document.getElementById('preview-stars')), []);

  useEffect(() => {
    const connection = new URLSearchParams(window.location.search).get('connection');
    if (!connection) { setReal(null); return; }
    (async () => {
      try {
        const res = await fetch(`/api/dev/synastry-reading?connection=${encodeURIComponent(connection)}&lang=${language}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setReal({ reading: data.reading, chartA: data.chartA, chartB: data.chartB });
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : 'failed');
      }
    })();
  }, [language]);

  const reading = real?.reading ?? SAMPLE_READING;
  const chartA = real ? real.chartA ?? undefined : SAMPLE_CHART_A;
  const chartB = real ? real.chartB ?? undefined : SAMPLE_CHART_B;

  return (
    <div>
      <div className="stars" id="preview-stars" />
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
        </div>
      </nav>

      {loadErr && (
        <div style={{ padding: 80, textAlign: 'center', color: '#ff6b6b' }}>
          Failed to load reading: {loadErr}
        </div>
      )}
      <SynastryView reading={reading} language={language} chartA={chartA} chartB={chartB} />
    </div>
  );
}
