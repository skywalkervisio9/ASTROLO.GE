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

interface Star {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  twMax: number;
  variant: '' | 's2' | 's3';
  trail: { len: number; jitter: number } | null;
}

function useStarfield(count = 38): Star[] {
  // Generate on the client only — Math.random() mismatches between SSR and
  // CSR, so we start with an empty array and fill it on mount.
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    const arr: Star[] = [];
    for (let i = 0; i < count; i++) {
      const variant = i % 7 === 0 ? 's3' : i % 3 === 0 ? 's2' : '';
      // ~35% of stars are tagged for trails. The base direction comes from
      // the container's --motion-angle (dynamic, follows current parallax);
      // per-star jitter (±15°) prevents a uniform comb look. Trail length
      // varies so some stars streak farther than others.
      const trail = Math.random() < 0.35
        ? {
            len: Math.round(14 + Math.random() * 30),
            jitter: Math.round(Math.random() * 30 - 15),
          }
        : null;
      arr.push({
        id: i,
        left: (Math.random() * 100).toFixed(2) + '%',
        top: (Math.random() * 100).toFixed(2) + '%',
        delay: (Math.random() * 5).toFixed(2) + 's',
        duration: (3 + Math.random() * 4).toFixed(2) + 's',
        twMax: 0.35 + Math.random() * 0.45,
        variant,
        trail,
      });
    }
    setStars(arr);
  }, [count]);
  return stars;
}

// Soft aura of glowing star-motes that replaces the old radial "spark" ticks.
// Deterministic (no Math.random) so SSR and CSR markup match.
const MOTES = Array.from({ length: 14 }).map((_, i) => ({
  a: (360 / 14) * i,
  r: 78 + (i % 3) * 9,
  size: i % 4 === 0 ? 3.5 : i % 2 === 0 ? 2.5 : 2,
  rose: i % 3 === 1,
  delay: (i * 0.34).toFixed(2),
}));

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
    // Trail state: smoothed velocity components + magnitude. Angle is derived
    // from svx/svy, not from raw cx-prevCx — otherwise it jitters every frame.
    let prevCx = 0, prevCy = 0, mmag = 0, svx = 0, svy = 0;
    const clamp = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);

    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty('--ryd', (cx * 9).toFixed(2) + 'deg');
      el.style.setProperty('--rxd', (-cy * 9).toFixed(2) + 'deg');
      el.style.setProperty('--px', (cx * 14).toFixed(2) + 'px');
      el.style.setProperty('--py', (cy * 14).toFixed(2) + 'px');
      // Smooth the velocity components, then derive magnitude + angle. Trail
      // CSS rotation 0 points downward; opposite-to-motion = motionAngle + 90.
      const rawVx = cx - prevCx, rawVy = cy - prevCy;
      svx += (rawVx - svx) * 0.22;
      svy += (rawVy - svy) * 0.22;
      const speed = Math.sqrt(svx * svx + svy * svy);
      const target = Math.min(1, speed * 70);
      mmag += (target - mmag) * (target > mmag ? 0.32 : 0.045);
      el.style.setProperty('--mmag', mmag.toFixed(3));
      if (speed > 0.0008) {
        const deg = Math.atan2(svy, svx) * 180 / Math.PI + 90;
        el.style.setProperty('--motion-angle', deg.toFixed(1) + 'deg');
      }
      prevCx = cx; prevCy = cy;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMouse = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
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
  const stars = useStarfield(42);
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
            className={`sycos-star${s.variant ? ' ' + s.variant : ''}${s.trail ? ' has-trail' : ''}`}
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
              ['--tw-max' as never]: String(s.twMax),
              ...(s.trail && {
                ['--trail-len' as never]: s.trail.len + 'px',
                ['--trail-jitter' as never]: s.trail.jitter + 'deg',
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
          <div className="sycos-dust">
            <div className="sycos-dust-rot">
              {MOTES.map((m, i) => (
                <span
                  key={i}
                  className={`sycos-mote${m.rose ? ' rose' : ''}`}
                  style={{
                    width: m.size,
                    height: m.size,
                    transform: `translate(-50%,-50%) rotate(${m.a}deg) translateY(-${m.r}px)`,
                    animationDelay: m.delay + 's',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="sycos-glyph">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <use href="#gl-conjunction" />
            </svg>
          </div>
        </div>
      </div>

      <div className="sycos-content">
        <div className="sycos-eyebrow">{copy.eyebrow}</div>
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
