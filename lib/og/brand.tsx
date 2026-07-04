// ============================================================
// Shared brand lock-up for OG share images (natal + synastry).
// Renders the real ASTROLO.GE logo — the gold four-pointed sparkle
// in a ringed mark plus the Transcity wordmark — instead of a plain
// system font, so social cards match the in-app header.
// ============================================================

import type { ReactNode } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const fontFile = (name: string) => readFile(join(process.cwd(), 'app', 'fonts', name));

/** Fonts for the OG cards: Transcity for the wordmark, Noto Sans Georgian for
 *  the body (names/taglines can be Georgian, which Transcity can't render).
 *  Requires the Node runtime (fs) — OG routes using this must not be edge. */
export async function brandFonts() {
  const [brand, bodyRegular, bodyBold] = await Promise.all([
    fontFile('Transcity.otf'),
    fontFile('NotoSansGeorgian-Regular.ttf'),
    fontFile('NotoSansGeorgian-Bold.ttf'),
  ]);
  return [
    { name: 'Transcity', data: brand, style: 'normal' as const, weight: 400 as const },
    { name: 'Noto Sans Georgian', data: bodyRegular, style: 'normal' as const, weight: 400 as const },
    { name: 'Noto Sans Georgian', data: bodyBold, style: 'normal' as const, weight: 700 as const },
  ];
}

/** Default body font family for the OG cards (Georgian + Latin coverage). */
export const OG_BODY_FONT = 'Noto Sans Georgian';

// Gold palette mirrors globals.css :root (--gold-bright / --gold / --gd).
const GOLD_BRIGHT = '#e4c76b';
const GOLD = '#c9a84c';
const GOLD_DEEP = '#8a6d2b';

// The four-pointed brand sparkle (same path as #gl-brand-sparkle / icon.svg).
const SPARKLE = 'M12 1.5l2.6 7.8L22.5 12l-7.9 2.7L12 22.5l-2.6-7.8L1.5 12l7.9-2.7z';

/** The ASTROLO.GE logo lock-up: ringed sparkle mark + gradient wordmark. */
export function BrandLockup({ size = 44 }: { size?: number }) {
  const ring = size;
  const star = Math.round(size * 0.52);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.36 }}>
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: ring,
          border: `1px solid ${GOLD_DEEP}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={star} height={star} viewBox="0 0 24 24">
          <path d={SPARKLE} fill={GOLD_BRIGHT} />
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Transcity',
          fontSize: size * 0.86,
          letterSpacing: '0.04em',
          lineHeight: 1,
          backgroundImage: `linear-gradient(180deg, ${GOLD_BRIGHT} 0%, ${GOLD} 55%, ${GOLD_DEEP} 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        ASTROLO.GE
      </div>
    </div>
  );
}

/** Sun glyph (ringed dot) as inline SVG, gold stroke. */
function SunGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="6" fill="none" stroke={GOLD_BRIGHT} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.7" fill={GOLD_BRIGHT} />
    </svg>
  );
}

/** Moon glyph (crescent) as inline SVG, gold stroke. */
function MoonGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M16 4a8 8 0 1 0 0 16 6 6 0 0 1 0-16z" fill="none" stroke={GOLD_BRIGHT} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** "☉ Cancer   ☾ Aquarius" placement line for the natal card. Names are
 *  already localized by the caller; either may be null (glyph is omitted). */
export function SunMoonLine({ sun, moon, size = 34 }: { sun: string | null; moon: string | null; size?: number }) {
  const item = (glyph: ReactNode, name: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }}>
      {glyph}
      <span style={{ display: 'flex', color: '#e8d9a8', fontSize: size }}>{name}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 1.3 }}>
      {sun && item(<SunGlyph size={size} />, sun)}
      {moon && item(<MoonGlyph size={size} />, moon)}
    </div>
  );
}
