'use client';

// ============================================================
// SynastryCosmicState — minimalistic cosmic loader / empty CTA
// for the synastry tab. Used for empty/loading/generating/error.
//
// Two glowing orbs orbiting a pulsing conjunction glyph, ringed
// by a slow zodiac/aspect circle and a soft twinkling starfield.
// All animations are CSS-only (see app/globals.css `.sycos-*`).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '@/types/user';

type Mode = 'empty' | 'loading' | 'generating' | 'error';

interface Props {
  mode: Mode;
  language: Language;
  /** Free-text status from the wrapper's pollers (generating mode). */
  progressLabel?: string;
  /** Empty-state CTA handler. */
  onInvite?: () => void;
  /** Error-mode message. */
  errorText?: string;
}

// Rotating status messages — same style as /loading screen, scoped to synastry.
const GENERATING_MSGS: Record<Language, string[]> = {
  ka: [
    'ვარსკვლავური კოორდინატების შედარება…',
    'პლანეტარული ასპექტების ანალიზი…',
    'ემოციური ბმის გამოვლენა…',
    'კარმული გადაკვეთების მოძიება…',
    'ელემენტური ჰარმონიის გაანგარიშება…',
    'ცეცხლი და წყალი ერთმანეთს ხვდებიან…',
    'თქვენი ისტორიის ციური ნაკვეთის ქსოვა…',
  ],
  en: [
    'Comparing stellar coordinates…',
    'Analysing planetary aspects…',
    'Tracing the emotional thread…',
    'Looking for karmic crossings…',
    'Weighing elemental harmony…',
    'Where fire meets water…',
    'Weaving the celestial plot of your story…',
  ],
};

const LOADING_MSGS: Record<Language, string> = {
  ka: 'სინასტრიის ჩატვირთვა…',
  en: 'Loading synastry…',
};

const COPY: Record<Mode, Record<Language, { eyebrow: string; title: string; sub: string; cta?: string; note?: string }>> = {
  empty: {
    ka: {
      eyebrow: '· სინასტრია ·',
      title: 'ორი რუკის შეხვედრა',
      sub: 'მოიწვიე პარტნიორი ან მეგობარი — შენი ვარსკვლავური თავსებადობის ღრმა ანალიზისთვის.',
      cta: 'მოიწვიე პარტნიორი',
    },
    en: {
      eyebrow: '· synastry ·',
      title: 'Where Two Charts Meet',
      sub: 'Invite a partner or a friend — for a deep look at the way your stars align.',
      cta: 'Invite a partner',
    },
  },
  loading: {
    ka: {
      eyebrow: '· სინასტრია ·',
      title: 'ვარსკვლავური თავსებადობა',
      sub: 'ერთი წამი, თქვენი ციური რუკები ერთიანდება…',
    },
    en: {
      eyebrow: '· synastry ·',
      title: 'Stellar Compatibility',
      sub: 'One moment — your celestial charts are joining…',
    },
  },
  generating: {
    ka: {
      eyebrow: '· იქმნება ·',
      title: 'თქვენი ვარსკვლავური ისტორია იწერება',
      sub: 'ანალიზი ერთ რამდენიმე წუთს მოითხოვს. შეგიძლია გაჩერდე და დაელოდო — ან მოგვიანებით დაბრუნდე.',
      note: 'შენ ამ მომენტში ცას ერთად კითხულობთ.',
    },
    en: {
      eyebrow: '· generating ·',
      title: 'Your Stellar Story Is Being Written',
      sub: 'This takes a few minutes. You can wait here — or come back later.',
      note: 'You and your other are being read in the same sky.',
    },
  },
  error: {
    ka: {
      eyebrow: '· შეცდომა ·',
      title: 'ვერ მოხერხდა',
      sub: 'სცადე ხელახლა ან დაბრუნდი მოგვიანებით.',
    },
    en: {
      eyebrow: '· error ·',
      title: 'Something interrupted the reading',
      sub: 'Please retry, or come back in a moment.',
    },
  },
};

interface Star {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  twMax: number;
  variant: '' | 's2' | 's3';
}

function useStarfield(count = 38): Star[] {
  // Generate on the client only — Math.random() mismatches between SSR and
  // CSR, so we start with an empty array and fill it on mount.
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      const variant = i % 7 === 0 ? 's3' : i % 3 === 0 ? 's2' : '';
      arr.push({
        id: i,
        left: (Math.random() * 100).toFixed(2) + '%',
        top: (Math.random() * 100).toFixed(2) + '%',
        delay: (Math.random() * 5).toFixed(2) + 's',
        duration: (3 + Math.random() * 4).toFixed(2) + 's',
        twMax: 0.35 + Math.random() * 0.45,
        variant,
      });
    }
    setStars(arr);
  }, [count]);
  return stars;
}

export default function SynastryCosmicState({ mode, language, progressLabel, onInvite, errorText }: Props) {
  const stars = useStarfield(42);
  const copy = COPY[mode][language];
  const msgs = GENERATING_MSGS[language];
  const [msgIdx, setMsgIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const lastProgressRef = useRef<string | undefined>(progressLabel);

  // Rotate messages every ~4.5s with a soft fade.
  useEffect(() => {
    if (mode !== 'generating') return;
    const id = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setMsgIdx((i) => (i + 1) % msgs.length);
        setFading(false);
      }, 420);
    }, 4500);
    return () => window.clearInterval(id);
  }, [mode, msgs.length]);

  // Reset cycle when a fresh upstream progress label arrives.
  useEffect(() => {
    if (progressLabel && progressLabel !== lastProgressRef.current) {
      lastProgressRef.current = progressLabel;
      setMsgIdx(0);
    }
  }, [progressLabel]);

  const currentMsg = (() => {
    if (mode === 'loading') return LOADING_MSGS[language];
    if (mode === 'generating') return msgs[msgIdx];
    return null;
  })();

  return (
    <>
      {/* Clear the 56px fixed header — same spacer SynastryView uses. */}
      <div style={{ height: '56px' }} />
      <div className="sycos" role="status" aria-live="polite">
      <div className="sycos-starfield" aria-hidden>
        {stars.map((s) => (
          <span
            key={s.id}
            className={`sycos-star${s.variant ? ' ' + s.variant : ''}`}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
              ['--tw-max' as never]: String(s.twMax),
            }}
          />
        ))}
      </div>
      <div className="sycos-glow" aria-hidden />

      <div className="sycos-scene" aria-hidden>
        <div className="sycos-ring" />
        <div className="sycos-orbit">
          <span className="sycos-orbit-line" />
          <span className="sycos-orb sycos-orb-a" />
          <span className="sycos-orb sycos-orb-b" />
        </div>
        <div className="sycos-spark">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ transform: `rotate(${i * 45}deg)` }} />
          ))}
        </div>
        <div className="sycos-glyph">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <use href="#gl-conjunction" />
          </svg>
        </div>
      </div>

      <div className="sycos-content">
        <div className="sycos-eyebrow">{copy.eyebrow}</div>
        <h1 className="sycos-title">{copy.title}</h1>
        <p className="sycos-sub">{copy.sub}</p>

        {mode === 'empty' && onInvite && (
          <button type="button" className="sycos-cta" onClick={onInvite}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>{copy.cta}</span>
          </button>
        )}

        {(mode === 'loading' || mode === 'generating') && (
          <>
            <div className={`sycos-msg${fading ? ' fade' : ''}`}>{currentMsg}</div>
            <div className="sycos-progress" aria-hidden />
            {copy.note && <div className="sycos-note">{copy.note}</div>}
          </>
        )}

        {mode === 'error' && (
          <>
            <div className="sycos-err">{errorText || copy.sub}</div>
            <button
              type="button"
              className="sycos-cta"
              style={{ marginTop: 18 }}
              onClick={() => window.location.reload()}
            >
              <span>{language === 'ka' ? 'სცადე ხელახლა' : 'Try again'}</span>
            </button>
          </>
        )}
      </div>
      </div>
    </>
  );
}
