// ============================================================
// Shared renderers for the OG share cards (natal + synastry),
// localized KA/EN. Rendered by the /share-image/[lang] route
// handlers. Keeps the ASTROLO.GE logo; body text uses Noto Sans
// Georgian so Georgian names render correctly.
// ============================================================

import { ImageResponse } from 'next/og';
import { BrandLockup, SunMoonLine, brandFonts, OG_BODY_FONT } from '@/lib/og/brand';
import { localizedSignName, type OgLang } from '@/lib/og/signs';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/** Coerce an arbitrary path/query value to a supported card language. */
export function resolveOgLang(raw: string | null | undefined): OgLang {
  return raw === 'en' ? 'en' : 'ka';
}

const CARD_BG = 'linear-gradient(135deg, #0a0a1e 0%, #1a0f2e 50%, #0a0a1e 100%)';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: CARD_BG,
        color: '#f5d98a',
        fontFamily: OG_BODY_FONT,
        padding: '80px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', marginBottom: 44 }}>
        <BrandLockup size={48} />
      </div>
      {children}
    </div>
  );
}

/** Natal card: name + "☉ sun  ☾ moon" placement line (no tagline, no degrees). */
export async function renderNatalCard(opts: {
  name: string;
  sunSign: string | null;
  moonSign: string | null;
  lang: OgLang;
}) {
  const sun = localizedSignName(opts.sunSign, opts.lang);
  const moon = localizedSignName(opts.moonSign, opts.lang);
  return new ImageResponse(
    (
      <Frame>
        <div
          style={{
            display: 'flex',
            fontSize: 78,
            fontWeight: 700,
            color: '#f5d98a',
            lineHeight: 1.1,
            maxWidth: 1040,
            marginBottom: sun || moon ? 36 : 0,
          }}
        >
          {opts.name}
        </div>
        {(sun || moon) && <SunMoonLine sun={sun} moon={moon} size={36} />}
      </Frame>
    ),
    { ...OG_SIZE, fonts: await brandFonts() },
  );
}

/** Synastry card: pair line + compatibility score (localized label). */
export async function renderSynastryCard(opts: {
  pair: string;
  score: number | null;
  lang: OgLang;
}) {
  const label = opts.lang === 'ka' ? 'თავსებადობა' : 'compatibility';
  return new ImageResponse(
    (
      <Frame>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            color: '#f5d98a',
            lineHeight: 1.1,
            maxWidth: 1040,
            marginBottom: opts.score != null ? 32 : 0,
          }}
        >
          {opts.pair}
        </div>
        {opts.score != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', color: '#c8b27a' }}>
            <span style={{ fontSize: 92, fontWeight: 700, color: '#f5d98a' }}>{opts.score}%</span>
            <span style={{ fontSize: 32, marginLeft: 20, opacity: 0.9 }}>{label}</span>
          </div>
        )}
      </Frame>
    ),
    { ...OG_SIZE, fonts: await brandFonts() },
  );
}
