'use client';

// ============================================================
// SynastryCosmicState — minimalistic cosmic loader for the
// synastry tab. Used for loading / generating / error states.
//
// Two glowing orbs orbiting a pulsing conjunction glyph, ringed
// by a slow zodiac/aspect circle and a soft twinkling starfield.
// All animations are CSS-only (see app/globals.css `.sycos-*`).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '@/types/user';

type Mode = 'loading' | 'generating' | 'error';

interface Props {
  mode: Mode;
  language: Language;
  /** Free-text status from the wrapper's pollers (generating mode). */
  progressLabel?: string;
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

// Synastry-oriented "did you know?" facts — rotated under the loader during
// generation. Same cadence and styling as the individual-loading screen's
// fun-fact section, but scoped to partner/friend astrology.
const FACT_LABELS: Record<Language, string> = {
  ka: '✦ იცოდი?',
  en: '✦ Did you know?',
};

const FACTS: Record<Language, string[]> = {
  ka: [
    'სინასტრია სწავლობს, როგორ ემთხვევა ორი ციური რუკის ენერგია — სიყვარულში, მეგობრობასა და თანამშრომლობაში.',
    'ვენერა-მარსის ასპექტი ხშირად განსაზღვრავს ფიზიკურ მიზიდულობასა და რომანტიკულ ქიმიას.',
    'მთვარის ნიშნების ჰარმონია ხშირად უფრო მნიშვნელოვანია ვიდრე მზის ნიშნების — ემოციური უსაფრთხოებისთვის.',
    'მეშვიდე სახლი არის პარტნიორობის სახლი — აქ ნაჩვენებია, როგორ ეძებ მეორე ნახევარს.',
    'სატურნის ასპექტი ორ რუკას შორის ხშირად ნიშნავს გრძელვადიან, კარმულ კავშირს.',
    'მერკურის შეთანხმება განსაზღვრავს, რამდენად ადვილად გესმით ერთმანეთის.',
    'მთვარის კვანძების შეხება ერთი რუკიდან მეორეზე — კარმული შეხვედრის ძლიერი ნიშანია.',
    'პლუტონის სინასტრიული კონტაქტი ღრმა ტრანსფორმაციას იწვევს ორივე პარტნიორში.',
  ],
  en: [
    'Synastry studies how the energies of two charts meet — in love, friendship, and partnership.',
    'Venus-Mars contacts often define physical attraction and the romantic chemistry between two people.',
    'Moon-sign harmony often matters more than Sun signs for lasting emotional safety.',
    'The 7th house is the house of partnership — it shows how you seek your "other half."',
    'A Saturn aspect between charts often signals a long-term, karmic bond.',
    'Mercury alignment shapes how easily two people understand each other.',
    "A lunar-node contact from one chart to the other is a hallmark of a 'destined' meeting.",
    'Pluto contacts in synastry trigger deep transformation in both partners.',
  ],
};

const COPY: Record<Mode, Record<Language, { eyebrow: string; title: string; sub: string }>> = {
  loading: {
    ka: {
      eyebrow: '· სინასტრია ·',
      title: 'ვარსკვლავური თავსებადობა',
      sub: 'ანალიზი რამდენიმე წუთს მოითხოვს, თქვენი ციური რუკები ერთიანდება…',
    },
    en: {
      eyebrow: '· synastry ·',
      title: 'Stellar Compatibility',
      sub: 'The analysis takes a few minutes — your celestial charts are joining…',
    },
  },
  generating: {
    ka: {
      eyebrow: '· იქმნება ·',
      title: 'თქვენი ვარსკვლავური ისტორია იწერება',
      sub: 'ანალიზი რამდენიმე წუთს მოითხოვს. შეგიძლია გაჩერდე და დაელოდო — ან მოგვიანებით დაბრუნდე.',
    },
    en: {
      eyebrow: '· generating ·',
      title: 'Your Stellar Story Is Being Written',
      sub: 'This takes a few minutes. You can wait here — or come back later.',
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

type TrailGroup = 'tg-fast' | 'tg-med' | 'tg-slow';

interface Star {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  twMax: number;
  variant: '' | 's2' | 's3';
  trail: { mult: number; group: TrailGroup } | null;
  // Depth ties parallax magnitude to trail feedback: tagged stars move with
  // strength = trail-mult; background stars barely move (0-0.25).
  depth: number;
}

function useStarfield(count = 38): Star[] {
  // Generate on the client only — Math.random() mismatches between SSR and
  // CSR, so we start with an empty array and fill it on mount.
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      const variant = i % 7 === 0 ? 's3' : i % 3 === 0 ? 's2' : '';
      // ~45% tagged for trails. Each tagged star picks one of three fluidity
      // groups (fast/med/slow) for tail-length variety. --depth matches the
      // trail-mult so visual feedback strength = parallax motion magnitude.
      const isTrail = Math.random() < 0.45;
      let trail: Star['trail'] = null;
      let depth = Math.random() * 0.25;
      if (isTrail) {
        const mult = 0.55 + Math.random() * 0.85;
        const gr = Math.random();
        const group: TrailGroup = gr < 0.4 ? 'tg-fast' : gr < 0.75 ? 'tg-med' : 'tg-slow';
        trail = { mult, group };
        depth = mult;
      }
      arr.push({
        id: i,
        left: (Math.random() * 100).toFixed(2) + '%',
        top: (Math.random() * 100).toFixed(2) + '%',
        delay: (Math.random() * 5).toFixed(2) + 's',
        duration: (3 + Math.random() * 4).toFixed(2) + 's',
        twMax: 0.35 + Math.random() * 0.45,
        variant,
        trail,
        depth,
      });
    }
    setStars(arr);
  }, [count]);
  return stars;
}

// Parallax tilt driven by mouse position (desktop) or device gyro (mobile).
// Writes smoothed CSS vars on the root: --ryd/--rxd (scene rotation, deg) and
// --px/--py (background drift, px). No-ops under prefers-reduced-motion.
function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    // Position-history particle trails — mirrors individual /loading exactly.
    // Push every frame, render 8-20 ghosts (depending on group) at fixed
    // indices into the buffer so vars evolve smoothly per-frame and trail
    // shape curves with actual motion path.
    const BUF_MAX = 24, WRITE_MAX = 20;
    const trailHist: { x: number; y: number }[] = [];
    let mmag = 0;
    let prevX = 0, prevY = 0, sVx = 0, sVy = 0;
    // Parallax range: --px = -cx * SCALE so per-star translate(--px * --depth)
    // moves stars opposite to gyro tilt (natural parallax) and same as mouse
    // cursor (negated in onMouse → double-negate = same direction).
    const PX_RANGE = 18;
    const clamp = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);

    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty('--ryd', (cx * 9).toFixed(2) + 'deg');
      el.style.setProperty('--rxd', (-cy * 9).toFixed(2) + 'deg');
      const curX = -cx * PX_RANGE, curY = -cy * PX_RANGE;
      el.style.setProperty('--px', curX.toFixed(2) + 'px');
      el.style.setProperty('--py', curY.toFixed(2) + 'px');
      trailHist.unshift({ x: curX, y: curY });
      if (trailHist.length > BUF_MAX) trailHist.pop();
      for (let i = 1; i <= WRITE_MAX; i++) {
        const p = trailHist[i] || trailHist[trailHist.length - 1];
        if (p) {
          el.style.setProperty('--t' + i + 'x', (p.x - curX).toFixed(1) + 'px');
          el.style.setProperty('--t' + i + 'y', (p.y - curY).toFixed(1) + 'px');
        }
      }
      // Smoothed velocity → sigmoid magnitude. Asymmetric ease (fast attack,
      // slow decay) so trails appear immediately and linger ~600ms after stop.
      const rawVx = curX - prevX, rawVy = curY - prevY;
      sVx += (rawVx - sVx) * 0.5;
      sVy += (rawVy - sVy) * 0.5;
      const d = Math.sqrt(sVx * sVx + sVy * sVy);
      const target = 1 - Math.exp(-d * 0.55);
      mmag += (target - mmag) * (target > mmag ? 0.32 : 0.05);
      el.style.setProperty('--mmag', mmag.toFixed(3));
      prevX = curX; prevY = curY;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMouse = (e: MouseEvent) => {
      // Negated so cursor right → stars follow right (paired with --px's own
      // negate in tick). Gyro stays opposite-tilt for natural parallax.
      tx = -((e.clientX / window.innerWidth) * 2 - 1);
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    // Calibrate gyro to the holding angle of the first reading.
    let baseG: number | null = null, baseB: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (baseG == null) { baseG = e.gamma; baseB = e.beta; }
      tx = clamp((e.gamma - baseG) / 28);
      ty = clamp((e.beta - (baseB as number)) / 28);
    };

    // iOS 13+ gates deviceorientation behind a permission prompt that must be
    // triggered by a user gesture; request it on the first tap/click.
    const DOE = window.DeviceOrientationEvent as unknown as
      { requestPermission?: () => Promise<string> } | undefined;
    let cleanupGesture: (() => void) | null = null;
    if (DOE && typeof DOE.requestPermission === 'function') {
      const onFirst = () => {
        DOE.requestPermission!()
          .then((s) => { if (s === 'granted') window.addEventListener('deviceorientation', onOrient, true); })
          .catch(() => {});
        cleanupGesture?.();
      };
      cleanupGesture = () => {
        window.removeEventListener('touchend', onFirst);
        window.removeEventListener('click', onFirst);
        cleanupGesture = null;
      };
      window.addEventListener('touchend', onFirst, { once: true });
      window.addEventListener('click', onFirst, { once: true });
    } else {
      window.addEventListener('deviceorientation', onOrient, true);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('deviceorientation', onOrient, true);
      cleanupGesture?.();
    };
  }, []);
  return ref;
}

export default function SynastryCosmicState({ mode, language, progressLabel, errorText }: Props) {
  const stars = useStarfield(90);
  const sceneRef = useParallax();
  const copy = COPY[mode][language];
  const msgs = GENERATING_MSGS[language];
  const facts = FACTS[language];
  const [msgIdx, setMsgIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * FACTS.ka.length));
  const [factFading, setFactFading] = useState(false);
  const lastProgressRef = useRef<string | undefined>(progressLabel);

  // While the cosmic state is mounted, suppress the page-level #stars
  // starfield so the user only sees the themed sycos-starfield. Without
  // this they're stacked and read as two separate parallax layers.
  useEffect(() => {
    document.body.classList.add('hide-global-stars');
    return () => { document.body.classList.remove('hide-global-stars'); };
  }, []);

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

  // Rotate fun-facts every 8s with a longer fade — matches the individual
  // /loading screen's `funFact` cadence so the rhythm feels familiar.
  useEffect(() => {
    if (mode !== 'generating' && mode !== 'loading') return;
    const id = window.setInterval(() => {
      setFactFading(true);
      window.setTimeout(() => {
        setFactIdx((i) => (i + 1) % facts.length);
        setFactFading(false);
      }, 400);
    }, 8000);
    return () => window.clearInterval(id);
  }, [mode, facts.length]);

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
      <div className="sycos" role="status" aria-live="polite" ref={sceneRef}>
      <div className="sycos-starfield" aria-hidden>
        {stars.map((s) => (
          <span
            key={s.id}
            className={`sycos-star${s.variant ? ' ' + s.variant : ''}${s.trail ? ' has-trail ' + s.trail.group : ''}`}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
              ['--tw-max' as never]: String(s.twMax),
              ['--depth' as never]: s.depth.toFixed(2),
              ...(s.trail && {
                ['--trail-mult' as never]: s.trail.mult.toFixed(2),
              }),
            }}
          />
        ))}
      </div>
      <div className="sycos-glow" aria-hidden />

      <div className="sycos-scene" aria-hidden>
        <div className="sycos-tilt">
          <div className="sycos-ring" />
          <div className="sycos-orbit">
            <span className="sycos-orbit-line" />
            <span className="sycos-orb sycos-orb-a" />
            <span className="sycos-orb sycos-orb-b" />
          </div>
          {/* Two luminous rings (gold + rose, echoing the orbiting orbs)
              gently overlap with a pulsing spark where they meet — a
              "two charts becoming one" union mark, the heart of synastry. */}
          <div className="sycos-glyph">
            <span className="sycos-union sycos-union-a" />
            <span className="sycos-union sycos-union-b" />
            <span className="sycos-union-spark" />
          </div>
        </div>
      </div>

      <div className="sycos-content">
        <h1 className="sycos-title">{copy.title}</h1>
        <p className="sycos-sub">{copy.sub}</p>

        {(mode === 'loading' || mode === 'generating') && (
          <>
            <div className={`sycos-msg${fading ? ' fade' : ''}`}>{currentMsg}</div>
            <div className="sycos-progress" aria-hidden />
            <div className="sycos-fact" style={{ opacity: factFading ? 0 : 1 }}>
              <div className="sycos-fact-label">{FACT_LABELS[language]}</div>
              <div className="sycos-fact-text">{facts[factIdx]}</div>
            </div>
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
