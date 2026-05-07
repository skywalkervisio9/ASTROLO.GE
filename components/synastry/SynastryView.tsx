'use client';

// ============================================================
// SynastryView — renders the s4 synastry reading JSON using the
// SAME short-form CSS class vocabulary as the natal reading
// (hydrated by prototype-runtime.js). This keeps both surfaces
// visually identical: .c / .b / .h / .ht / .ce / .tb2 / .sh / .st
// / .snav / .snb / .pq / .g2 / .af .ae .aa .aw .ar .as .ag
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Language } from '@/types/user';
import { renderText, setRenderLang } from '@/lib/utils/renderText';
import { renderExpanded } from '@/components/reading/renderBody';

// ── Types matching the s4 JSON schema ──

export interface SynastryCardData {
  id: string;
  label: string;
  title: string;
  body: string[];
  aspectType: 'harmony' | 'tension' | 'magnetic';
  // Two-color cards: A = personA's involved planet's sign element, B = personB's.
  accentElementA?: string;
  accentElementB?: string;
  // Legacy single-element field (still emitted by older readings)
  accentElement?: string;
  elementColor?: string;
  crossReferences: string[];
  expandedContent: string[] | null;
  hint: { title: string; content: string; bullets: string[] | null } | null;
}

export interface SynastrySectionData {
  sectionTitle: string;
  sectionSubtitle: string;
  cards: SynastryCardData[];
  pullQuote: string;
}

export interface SynastryMeta {
  type: string;
  language: string;
  personA: { name: string; sun: string; moon: string; asc: string };
  personB: { name: string; sun: string; moon: string; asc: string };
  compatibilityScore: number;
  categoryScores: Record<string, number>;
  categoryCaptions?: Record<string, string>;
}

export interface SynastryReadingData {
  meta: SynastryMeta;
  [sectionKey: string]: unknown;
}

export interface ChartPlanet {
  name: string;
  sign: string;
  degree: string;
  house: string;
  retrograde: boolean;
}

export interface ChartPersonData {
  planets: ChartPlanet[] | null;
  points: { ascendant?: { sign: string; degree: string }; [key: string]: unknown } | null;
}

// Section key order for couple vs friend
const COUPLE_SECTIONS = ['emotionalBond', 'passion', 'karmic', 'numerology', 'growth', 'sharedShadow', 'dailyRitual', 'potential'] as const;
const FRIEND_SECTIONS = ['emotionalBond', 'intellectualSynergy', 'karmic', 'numerology', 'growth', 'sharedShadow', 'sharedAdventures', 'potential'] as const;

const SECTION_NAV_KA: Record<string, string> = {
  emotionalBond: 'ემოციური',
  passion: 'ვნება',
  karmic: 'კარმული',
  numerology: 'ნუმეროლოგია',
  growth: 'ზრდა',
  sharedShadow: 'ჩრდილი',
  dailyRitual: 'პრაქტიკა',
  potential: 'პოტენციალი',
  intellectualSynergy: 'ინტელექტუალური',
  sharedAdventures: 'თავგადასავლები',
};

const SECTION_NAV_EN: Record<string, string> = {
  emotionalBond: 'Emotional',
  passion: 'Passion',
  karmic: 'Karmic',
  numerology: 'Numerology',
  growth: 'Growth',
  sharedShadow: 'Shadow',
  dailyRitual: 'Ritual',
  potential: 'Potential',
  intellectualSynergy: 'Intellectual',
  sharedAdventures: 'Adventures',
};

const CATEGORY_LABELS_KA: Record<string, string> = {
  emotional: 'ემოციური კავშირი',
  passion: 'ვნება',
  karmic: 'კარმა',
  growth: 'ზრდა',
  challenge: 'გამოწვევა',
  intellectual: 'ინტელექტი',
  values: 'ღირებულებები',
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  emotional: 'Emotional Bond',
  passion: 'Passion',
  karmic: 'Karmic',
  growth: 'Growth',
  challenge: 'Challenge',
  intellectual: 'Intellectual',
  values: 'Values',
};

// Category bar click → ordered list of candidate section keys to scroll to.
// First entry that exists in the current reading wins (couple vs. friend differ).
const CATEGORY_TO_SECTION: Record<string, string[]> = {
  emotional:    ['emotionalBond'],
  passion:      ['passion'],
  karmic:       ['karmic'],
  growth:       ['growth'],
  challenge:    ['sharedShadow'],
  intellectual: ['intellectualSynergy', 'numerology'],
  values:       ['numerology', 'potential'],
};

// elementColor string → short-form accent class used by .c (single-color cards)
const ELEMENT_ACCENT_CLASS: Record<string, string> = {
  fire: 'af',
  earth: 'ae',
  air: 'aa',
  water: 'aw',
  rose: 'ar',
  shadow: 'as',
  gold: 'ag',
};

// Per-element CSS palette used to render two-color synastry cards.
// Keys mirror the element names accepted by ELEMENT_ACCENT_CLASS above.
const ELEMENT_PALETTE: Record<string, { c: string; bg: string; hover: string; glow: string; glow2: string }> = {
  fire:   { c: 'var(--fire)',   bg: 'rgba(212,100,74,.13)',  hover: 'rgba(212,100,74,.22)',  glow: 'rgba(212,100,74,.06)',  glow2: 'rgba(212,100,74,.04)'  },
  earth:  { c: 'var(--earth)',  bg: 'rgba(107,154,107,.13)', hover: 'rgba(107,154,107,.22)', glow: 'rgba(107,154,107,.06)', glow2: 'rgba(107,154,107,.04)' },
  air:    { c: 'var(--air)',    bg: 'rgba(107,143,181,.13)', hover: 'rgba(107,143,181,.22)', glow: 'rgba(107,143,181,.06)', glow2: 'rgba(107,143,181,.04)' },
  water:  { c: 'var(--water)',  bg: 'rgba(123,107,170,.13)', hover: 'rgba(123,107,170,.22)', glow: 'rgba(123,107,170,.06)', glow2: 'rgba(123,107,170,.04)' },
  rose:   { c: 'var(--rose)',   bg: 'rgba(196,122,138,.13)', hover: 'rgba(196,122,138,.22)', glow: 'rgba(196,122,138,.06)', glow2: 'rgba(196,122,138,.04)' },
  shadow: { c: '#555',          bg: 'rgba(85,85,85,.13)',    hover: 'rgba(85,85,85,.22)',    glow: 'rgba(85,85,85,.06)',    glow2: 'rgba(85,85,85,.04)'    },
  gold:   { c: 'var(--gold)',   bg: 'rgba(201,168,76,.13)',  hover: 'rgba(201,168,76,.22)',  glow: 'rgba(201,168,76,.06)',  glow2: 'rgba(201,168,76,.04)'  },
};

// "{Name}'s chart →" / "{Name}-ს რუკა →" — used to label the partner card.
// Georgian: vowel-ending names take "ს", consonant-ending take "ის",
// non-Georgian (Latin) names get "-ს" so the suffix reads cleanly.
function chartPossessive(name: string, language: Language): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return language === 'ka' ? 'რუკა →' : 'Chart →';
  if (language === 'en') return `${trimmed}'s Chart →`;
  const last = trimmed.slice(-1);
  const isGeorgian = /[Ⴀ-ჿ]/.test(last);
  const isGeorgianVowel = 'აეიოუ'.includes(last);
  if (isGeorgianVowel) return `${trimmed}ს რუკა →`;
  if (isGeorgian) return `${trimmed}ის რუკა →`;
  return `${trimmed}-ს რუკა →`;
}

// English zodiac sign → Georgian name (AI emits English signs in meta.personA/B regardless of language)
const SIGN_KA: Record<string, string> = {
  aries: 'ვერძი',
  taurus: 'კურო',
  gemini: 'ტყუპები',
  cancer: 'კირჩხიბი',
  leo: 'ლომი',
  virgo: 'ქალწული',
  libra: 'სასწორი',
  scorpio: 'მორიელი',
  sagittarius: 'მშვილდოსანი',
  capricorn: 'თხის რქა',
  aquarius: 'მერწყული',
  pisces: 'თევზები',
};

function localizeSign(sign: string, language: Language): string {
  if (language !== 'ka' || !sign) return sign;
  const ka = SIGN_KA[sign.trim().toLowerCase()];
  return ka || sign;
}

// ── Main Component ──

interface SynastryViewProps {
  reading: SynastryReadingData;
  language: Language;
  onBackToNatal?: () => void;
  chartA?: ChartPersonData | null;
  chartB?: ChartPersonData | null;
  shareSlugA?: string | null;
  shareSlugB?: string | null;
  /** When set with synastryConnectionId, participants can copy `/s/{slug}` and toggle visibility. */
  synastryShareSlug?: string | null;
  synastryConnectionId?: string | null;
  synastryIsPublic?: boolean;
  /** Read-only cue on `/s/[slug]` public page (no toggle). */
  publicSynastrySlug?: string | null;
  /** True when the logged-in viewer is the inviter (personA). Used to put
   * the viewer's card on the right and align breadcrumb / "you" semantics
   * with whoever is actually viewing. Defaults true so the public /s/[slug]
   * page (no real viewer) keeps the inviter-on-left default. */
  viewerIsInviter?: boolean;
}

export default function SynastryView({
  reading,
  language,
  onBackToNatal,
  chartA,
  chartB,
  shareSlugA,
  shareSlugB,
  publicSynastrySlug,
  viewerIsInviter = true,
}: SynastryViewProps) {
  setRenderLang(language);
  const isFriend = reading.meta.type === 'synastry_friend';
  const sectionKeys = isFriend ? FRIEND_SECTIONS : COUPLE_SECTIONS;
  const navLabels = language === 'ka' ? SECTION_NAV_KA : SECTION_NAV_EN;
  const catLabels = language === 'ka' ? CATEGORY_LABELS_KA : CATEGORY_LABELS_EN;

  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const isProgrammaticNavScroll = useRef(false);
  const userOverrideUntil = useRef(0);

  // Scroll-aware active-section tracking (mirrors the nbtn behaviour in natal)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sectionRefs.current.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActiveSection(idx);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sectionRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [reading]);

  // Auto-center the active .snb pill within the .snav bar.
  // A manual horizontal scroll on the nav suspends centering for ~2.5s so
  // the user's position is preserved until the next section change.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (Date.now() < userOverrideUntil.current) return;

    const target = nav.querySelectorAll<HTMLButtonElement>('.snb')[activeSection];
    if (!target) return;

    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = (targetRect.left - navRect.left) + targetRect.width / 2 - navRect.width / 2;
    const desired = nav.scrollLeft + offset;
    if (Math.abs(desired - nav.scrollLeft) < 2) return;

    // rAF-based smooth scroll — Element.scrollTo({behavior:'smooth'}) silently
    // no-ops on some flex containers, so animate scrollLeft directly.
    isProgrammaticNavScroll.current = true;
    const startSL = nav.scrollLeft;
    const delta = desired - startSL;
    const dur = 380;
    let startT: number | undefined;
    let rafId: number;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const step = (t: number) => {
      if (startT === undefined) startT = t;
      const p = Math.min(1, (t - startT) / dur);
      nav.scrollLeft = startSL + delta * ease(p);
      if (p < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    const releaseTimer = window.setTimeout(() => {
      isProgrammaticNavScroll.current = false;
    }, dur + 120);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(releaseTimer);
    };
  }, [activeSection]);

  // Detect user-initiated horizontal scroll on the nav and arm an override window
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      if (isProgrammaticNavScroll.current) return;
      userOverrideUntil.current = Date.now() + 2500;
    };
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => nav.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = useCallback((idx: number) => {
    setActiveSection(idx);
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Extract sections that exist on this reading
  const sections = (sectionKeys as readonly string[])
    .map((key) => ({ key, data: reading[key] as SynastrySectionData | undefined }))
    .filter((s): s is { key: string; data: SynastrySectionData } => !!s.data);

  // Click on a category bar → scroll to the matching section. Falls back to a sibling
  // section when the direct target isn't present in this reading variant.
  const scrollToCategory = useCallback((catKey: string) => {
    const candidates = CATEGORY_TO_SECTION[catKey] || [];
    for (const sectionKey of candidates) {
      const idx = sections.findIndex((s) => s.key === sectionKey);
      if (idx >= 0) { scrollToSection(idx); return; }
    }
  }, [sections, scrollToSection]);

  const { meta } = reading;
  // The reading data is keyed personA/personB by inviter/invitee. Map both
  // sides onto viewer/other so the UI can put the logged-in user on the
  // right and surface "ჩემი რუკა" / isYou semantics on their card,
  // regardless of which side the AI labelled them.
  const viewerPerson = viewerIsInviter ? meta.personA : meta.personB;
  const otherPerson  = viewerIsInviter ? meta.personB : meta.personA;
  const viewerChart  = viewerIsInviter ? chartA : chartB;
  const otherChart   = viewerIsInviter ? chartB : chartA;
  const viewerSlug   = viewerIsInviter ? shareSlugA : shareSlugB;
  const otherSlug    = viewerIsInviter ? shareSlugB : shareSlugA;
  const heroTitle = isFriend
    ? (language === 'ka' ? 'ვარსკვლავთა მეგობრობა' : 'Starbound Friendship')
    : (language === 'ka' ? 'ვარსკვლავები ორისთვის' : 'Stars for Two');
  const heroSub = isFriend
    ? (language === 'ka' ? 'მეგობრული თავსებადობის ანალიზი' : 'Friendship Compatibility Analysis')
    : (language === 'ka' ? 'სინასტრიის სიღრმისეული ანალიზი' : 'Deep Synastry Analysis');

  return (
    <>
      <div style={{ height: '56px' }} />
      <div className="ct">
        {/* Breadcrumb */}
        <div className="bnav">
          <button className="bb" onClick={() => viewerSlug ? window.location.href = `/r/${viewerSlug}` : onBackToNatal?.()}>
            ← {language === 'ka' ? 'ჩემი რუკა' : 'My Chart'}
          </button>
          <span className="ndv">·</span>
          <button className="bb active">
            <svg style={{ width: '10px', height: '10px', fill: 'var(--gold)' }}><use href="#gl-conjunction" /></svg>
            <span>{language === 'ka' ? 'სინასტრია' : 'Synastry'}</span>
          </button>
          <span className="ndv">·</span>
          <button
            type="button"
            className="bb"
            disabled={!otherSlug}
            onClick={() =>
              otherSlug ? (window.location.href = `/r/${otherSlug}`) : undefined
            }
            style={!otherSlug ? { opacity: 0.45, cursor: 'default' } : undefined}
          >
            {chartPossessive(otherPerson.name, language)}
          </button>
        </div>

        {/* Hero */}
        <div className="chero section-reveal vis">
          <div className="chero-glow" />
          <SigilSVG />
          <h1>{heroTitle}</h1>
          <div className="tg">{heroSub}</div>
          {publicSynastrySlug && (
            <div className="tg" style={{ marginTop: 12, fontSize: '.78rem', opacity: 0.55 }}>
              {language === 'ka' ? `გასაზიარებელი გვერდი: /s/${publicSynastrySlug}` : `Share path: /s/${publicSynastrySlug}`}
            </div>
          )}
        </div>

        {/* Partner Cards */}
        <div className="pcards section-reveal vis">
          <PartnerCard person={viewerPerson} isYou language={language} chart={viewerChart ?? undefined} shareSlug={viewerSlug ?? undefined} />
          <div className="bridge">
            <div className="bridge-line" />
            <div className="bridge-icon">
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(201,168,76,.3)" strokeWidth="1" />
                <text x="20" y="24" textAnchor="middle" fill="var(--gold)" fontSize="14" fontFamily="serif">☌</text>
              </svg>
            </div>
            <div className="bridge-line" />
          </div>
          <PartnerCard person={otherPerson} language={language} chart={otherChart ?? undefined} shareSlug={otherSlug ?? undefined} />
        </div>

        {/* Compatibility Wheel */}
        <CompatibilityWheel score={meta.compatibilityScore} language={language} />

        {/* Category Scores */}
        <div className="cats section-reveal vis">
          {Object.entries(meta.categoryScores ?? {}).map(([key, score]) => (
            <CategoryBar
              key={key}
              category={key}
              label={catLabels[key] || key}
              score={score as number}
              caption={meta.categoryCaptions?.[key]}
              onClick={() => scrollToCategory(key)}
            />
          ))}
        </div>

        {/* Section Navigation — uses .snav/.snb (same as natal synastry shared nav) */}
        <nav className="snav" ref={navRef} role="tablist">
          {sections.map((s, i) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={activeSection === i}
              className={`snb${activeSection === i ? ' active' : ''}`}
              onClick={() => scrollToSection(i)}
            >
              {navLabels[s.key] || s.key}
            </button>
          ))}
        </nav>

        {/* Sections — each uses .sh / .c / .b / .ce / .tb2 / .h / .ht just like natal */}
        {sections.map((s, i) => (
          <SynastrySection
            key={s.key}
            ref={(el) => { sectionRefs.current[i] = el; }}
            sectionId={`syn-${s.key}`}
            section={s.data}
            language={language}
          />
        ))}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-copy">© 2026 ASTROLO.GE</div>
        </footer>
      </div>
    </>
  );
}

// ── Sub-components ──

function SigilSVG() {
  return (
    <div className="chero-sigil">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g className="sigil-ring">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(201,168,76,.15)" strokeWidth=".8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(201,168,76,.08)" strokeWidth=".5" strokeDasharray="2 4" />
        </g>
        <g className="sigil-inner">
          <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth=".6" />
          <path d="M38 38a14 14 0 1 0 0 24 10 10 0 0 1 0-24z" fill="none" stroke="rgba(201,168,76,.6)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="58" cy="50" r="7" fill="none" stroke="rgba(201,168,76,.6)" strokeWidth="1.2" />
          <circle cx="58" cy="50" r="1.5" fill="rgba(201,168,76,.5)" />
        </g>
      </svg>
    </div>
  );
}

// Glyph map for planet names (English keys as stored in DB)
const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_ORDER = ['Sun', 'Moon', 'Venus', 'Mars'];

// Georgian planet names
const PLANET_KA: Record<string, string> = {
  Sun: 'მზე', Moon: 'მთვარე', Mercury: 'მერკური', Venus: 'ვენერა',
  Mars: 'მარსი', Jupiter: 'იუპიტერი', Saturn: 'სატურნი',
  Uranus: 'ურანი', Neptune: 'ნეპტუნი', Pluto: 'პლუტონი',
};

function PartnerCard({
  person,
  isYou,
  language,
  chart,
  shareSlug,
}: {
  person: { name: string; sun: string; moon: string; asc: string };
  isYou?: boolean;
  language: Language;
  chart?: ChartPersonData;
  shareSlug?: string;
}) {
  const initial = person.name.charAt(0).toUpperCase();

  // Build ordered planet rows from chart data, falling back to meta sun/moon/asc
  const planetRows: { glyph: string; label: string; sign: string; degree: string; retrograde: boolean }[] = [];

  if (chart?.planets && chart.planets.length > 0) {
    const byName = new Map(chart.planets.map(p => [p.name, p]));
    // ASC from points
    const ascDeg = chart.points?.ascendant?.degree ?? '';
    const ascSign = chart.points?.ascendant?.sign ?? person.asc;
    // Insert ASC after Moon
    const insertAsc = (rows: typeof planetRows) => {
      rows.push({
        glyph: 'ASC',
        label: 'ASC',
        sign: ascSign,
        degree: ascDeg,
        retrograde: false,
      });
    };

    for (const name of PLANET_ORDER) {
      const p = byName.get(name);
      if (!p) continue;
      planetRows.push({
        glyph: PLANET_GLYPHS[name] || name,
        label: language === 'ka' ? (PLANET_KA[name] || name) : name,
        sign: p.sign,
        degree: p.degree,
        retrograde: p.retrograde,
      });
      if (name === 'Moon') insertAsc(planetRows);
    }
  } else {
    // Fallback: only sun, moon, asc from meta
    planetRows.push({ glyph: '☉', label: language === 'ka' ? 'მზე' : 'Sun', sign: person.sun, degree: '', retrograde: false });
    planetRows.push({ glyph: '☽', label: language === 'ka' ? 'მთვარე' : 'Moon', sign: person.moon, degree: '', retrograde: false });
    planetRows.push({ glyph: 'ASC', label: 'ASC', sign: person.asc, degree: '', retrograde: false });
  }

  const handleCardClick = shareSlug ? () => { window.location.href = `/r/${shareSlug}`; } : undefined;

  return (
    <div className="pc" onClick={handleCardClick} style={shareSlug ? { cursor: 'pointer' } : undefined}>
      {isYou && <div className="pc-you-dot" />}
      {isYou && <div className="pc-tooltip">{language === 'ka' ? 'ჩემი რუკა →' : 'My Chart →'}</div>}
      {!isYou && shareSlug && <div className="pc-other-tag">{chartPossessive(person.name, language)}</div>}
      <div className="pc-avatar"><span className="pc-avatar-letter">{initial}</span></div>
      <div className="pc-name">{person.name}</div>
      <div className="pc-sub">{renderText(`${localizeSign(person.sun, language)} · ${localizeSign(person.moon, language)} · ${localizeSign(person.asc, language)}`)}</div>
      <div className="pc-placements">
        {planetRows.map((row) => (
          <div className="pc-row" key={row.label}>
            <span className="pc-row-label">
              {row.glyph === 'ASC' ? (
                <span className="gi-acr tip" data-tip={language === 'ka' ? 'ასცენდენტი' : 'Ascendant'}>{row.glyph}</span>
              ) : (
                <>
                  <span className="pc-row-glyph">{row.glyph}</span>
                  <span className="pc-row-name">{row.label}</span>
                </>
              )}
            </span>
            <span className="pc-row-val">
              {renderText(localizeSign(row.sign, language))}
              {row.degree && <span className="pc-row-deg">{row.degree}</span>}
              {row.retrograde && <span className="pc-row-rx">℞</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompatibilityWheel({ score, language }: { score: number; language: Language }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="wheel-section section-reveal vis">
      <div className="wheel-wrap">
        <div className="wheel-ring" />
        <svg className="wheel-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(201,168,76,.08)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="wheel-center">
          <div className="wheel-num">{score}</div>
          <div className="wheel-label">{language === 'ka' ? 'თავსებადობა' : 'Compatibility'}</div>
        </div>
      </div>
    </div>
  );
}

// Category → element accent var for the .cat-fill gradient
const CAT_TO_ELEMENT: Record<string, string> = {
  emotional: 'var(--water)',
  passion: 'var(--fire)',
  karmic: 'var(--gold)',
  growth: 'var(--earth)',
  challenge: 'var(--fire)',
  intellectual: 'var(--air)',
  values: 'var(--gold)',
};

function CategoryBar({ category, label, score, caption, onClick }: { category: string; label: string; score: number; caption?: string; onClick?: () => void }) {
  const tone = CAT_TO_ELEMENT[category] || 'var(--gold)';
  return (
    <div
      className={`cat${onClick ? ' cat-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="cat-top">
        <span className="cat-name">{label}</span>
        <span className="cat-score" style={{ color: tone }}>{score}%</span>
      </div>
      <div className="cat-bar">
        <div
          className="cat-fill"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${tone}, color-mix(in srgb, ${tone} 55%, transparent))`,
          }}
        />
      </div>
      {caption && <p className="cat-desc">{renderText(caption)}</p>}
    </div>
  );
}

// ── Section renderer — uses .sh / .sh h2 / .st / .pq (natal pattern) ──

const SynastrySection = React.forwardRef<HTMLElement, {
  sectionId: string;
  section: SynastrySectionData;
  language: Language;
}>(function SynastrySection({ sectionId, section, language }, ref) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // First card full-width, rest in a 2-col .g2 grid (same as natal _buildCardsGrid)
  const cards = section.cards ?? [];
  const lead = cards[0];
  const rest = cards.slice(1);
  const pairs: SynastryCardData[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    pairs.push(rest.slice(i, i + 2));
  }

  return (
    <section id={sectionId} className="vis" ref={ref}>
      <div className="sh">
        <h2>{renderText(section.sectionTitle)}</h2>
        {section.sectionSubtitle && <div className="st">{renderText(section.sectionSubtitle)}</div>}
      </div>

      {lead && (
        <SynastryCardComponent
          card={lead}
          expanded={expandedCards.has(lead.id)}
          onToggleExpand={() => toggleExpand(lead.id)}
          language={language}
        />
      )}

      {pairs.map((pair, idx) => (
        pair.length === 2 ? (
          <div className="g2" key={idx}>
            {pair.map((card) => (
              <SynastryCardComponent
                key={card.id}
                card={card}
                expanded={expandedCards.has(card.id)}
                onToggleExpand={() => toggleExpand(card.id)}
                language={language}
              />
            ))}
          </div>
        ) : (
          <SynastryCardComponent
            key={pair[0].id}
            card={pair[0]}
            expanded={expandedCards.has(pair[0].id)}
            onToggleExpand={() => toggleExpand(pair[0].id)}
            language={language}
          />
        )
      ))}

      {section.pullQuote && (
        <div className="pq">
          <p>{renderText(section.pullQuote)}</p>
        </div>
      )}
    </section>
  );
});

// ── Card renderer — mirrors natal _buildCard short-form pattern ──

function SynastryCardComponent({
  card,
  expanded,
  onToggleExpand,
  language,
}: {
  card: SynastryCardData;
  expanded: boolean;
  onToggleExpand: () => void;
  language: Language;
}) {
  // Resolve up to two element accents. Falls back to legacy single-element fields.
  const rawA = (card.accentElementA ?? card.accentElement ?? card.elementColor ?? '').toLowerCase();
  const rawB = (card.accentElementB ?? '').toLowerCase();
  const palA = ELEMENT_PALETTE[rawA];
  const palB = ELEMENT_PALETTE[rawB];
  const isTwoColor = !!(palA && palB);

  let cardClass = 'c';
  let cardStyle: React.CSSProperties | undefined;
  if (isTwoColor) {
    cardClass = 'c c-2c';
    cardStyle = {
      ['--cL' as never]: palA.c,
      ['--cR' as never]: palB.c,
      ['--cL-bg' as never]: palA.bg,
      ['--cR-bg' as never]: palB.bg,
      ['--cL-hover' as never]: palA.hover,
      ['--cR-hover' as never]: palB.hover,
      ['--cL-glow' as never]: palA.glow,
      ['--cR-glow' as never]: palB.glow,
      ['--cL-glow2' as never]: palA.glow2,
      ['--cR-glow2' as never]: palB.glow2,
    };
  } else if (palA) {
    cardClass = `c ${ELEMENT_ACCENT_CLASS[rawA] || ''}`.trim();
  }

  const crossRefsArray = Array.isArray(card.crossReferences)
    ? card.crossReferences
    : card.crossReferences
    ? [card.crossReferences]
    : [];
  const hasCrossRefs = crossRefsArray.length > 0;
  const crossRefPopup = hasCrossRefs ? crossRefsArray.join(' · ') : undefined;

  return (
    <div className={`${cardClass}${expanded ? ' is-open' : ''}`} style={cardStyle}>
      {/* Label badge — uses .b (matches natal). No leading aspect glyph. */}
      <div className={`b${hasCrossRefs ? ' has-popup' : ''}`}>
        {renderText(card.label)}
        {hasCrossRefs && <span className="label-popup">{crossRefPopup ? renderText(crossRefPopup) : null}</span>}
      </div>

      {/* Title — .c h3 styled automatically */}
      <h3>{renderText(card.title)}</h3>

      {/* Body paragraphs — direct <p> children of .c (matches natal .c p) */}
      {card.body.map((paragraph, i) => (
        <p key={i}>{renderText(paragraph)}</p>
      ))}

      {/* Expand button + .ce expand container — matches natal tb2/.ce */}
      {card.expandedContent && card.expandedContent.length > 0 && (
        <>
          <button className="tb2" onClick={onToggleExpand} aria-expanded={expanded}>
            {expanded
              ? (language === 'ka' ? '− დეტალები' : '− Details')
              : (language === 'ka' ? 'დეტალური ანალიზი ↓' : 'Detailed Analysis ↓')}
          </button>
          <div className={`ce${expanded ? ' open' : ''}`}>
            {renderExpanded(card.expandedContent)}
          </div>
        </>
      )}

      {/* Hint — uses .h/.ht (matches natal) */}
      {card.hint && (
        <div className="h">
          <div className="ht">
            <svg><use href="#gl-sparkle" /></svg>
            {renderText(card.hint.title)}
          </div>
          <p>{renderText(card.hint.content)}</p>
          {card.hint.bullets && card.hint.bullets.length > 0 && (
            <ul>
              {card.hint.bullets.map((b, i) => (
                <li key={i}>{renderText(b)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
