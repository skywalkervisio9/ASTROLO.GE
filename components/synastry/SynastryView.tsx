'use client';

// ============================================================
// SynastryView — renders the s4 synastry reading JSON using the
// SAME short-form CSS class vocabulary as the natal reading
// (hydrated by app-runtime.js). This keeps both surfaces
// visually identical: .c / .b / .h / .ht / .ce / .tb2 / .sh / .st
// / .snav / .snb / .pq / .g2 / .af .ae .aa .aw .ar .as .ag
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Language } from '@/types/user';
import { renderText, setRenderLang } from '@/lib/utils/renderText';
import { renderExpanded } from '@/components/reading/renderBody';
import { computeOverallScore, resolveTier, type TierResult } from '@/lib/synastry/scoring';

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
  /** Legacy field name (≤ s6). Read as a fallback for already-stored readings. */
  sectionTagline?: string;
  cards: SynastryCardData[];
  pullQuote: string;
}

export interface SynastryMeta {
  type: string;
  language: string;
  personA: { name: string; sun: string; moon: string; asc: string; gender?: string };
  personB: { name: string; sun: string; moon: string; asc: string; gender?: string };
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
  /** Full display name (from the users table); the card shows this instead of
   * the reading's first-name-only meta name. */
  fullName?: string | null;
  /** Birth date + time, surfaced under the partner name (from the users table). */
  birth?: { day?: number | null; month?: number | null; year?: number | null; hour?: number | null; minute?: number | null } | null;
}

// Georgian + English month names for the partner-card date of birth.
const MONTHS_KA = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatBirthDate(
  birth: { day?: number | null; month?: number | null; year?: number | null; hour?: number | null; minute?: number | null } | null | undefined,
  language: Language,
): string | null {
  if (!birth) return null;
  const { day, month, year, hour, minute } = birth;
  if (!day || !month || !year) return null;
  const name = (language === 'ka' ? MONTHS_KA : MONTHS_EN)[month - 1];
  if (!name) return null;
  const date = `${day} ${name} ${year}`;
  if (hour == null || minute == null) return date;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return `${date} · ${time}`;
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
  const navRef = useRef<HTMLDivElement>(null);
  const isProgrammaticNavScroll = useRef(false);
  const userOverrideUntil = useRef(0);

  // The synastry reading shares the natal page's twinkling starfield. The
  // cosmic loader hides it (via .hide-global-stars) while it's on screen and
  // clears it on unmount — but clear it here too so the reading always shows
  // the background stars, even if the loader path didn't run for this session.
  useEffect(() => {
    document.body.classList.remove('hide-global-stars');
  }, []);

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

  // The overall score resolves the whole reading → it jumps to the closing
  // "potential" chapter (where the relationship's forward arc is drawn).
  const scrollToPotential = useCallback(() => {
    const idx = sections.findIndex((s) => s.key === 'potential');
    if (idx >= 0) scrollToSection(idx);
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

  // ── Derived compatibility ──
  // The model proposes the six category scores; code owns the aggregate,
  // so the headline number can never contradict the bars it summarises.
  const relType: 'couple' | 'friend' = isFriend ? 'friend' : 'couple';
  const catScores = (meta.categoryScores ?? {}) as Record<string, number>;
  const catCaptions = meta.categoryCaptions ?? {};
  const resonanceEntries = Object.entries(catScores)
    .filter(([k, v]) => k !== 'challenge' && typeof v === 'number')
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  const signatureEntry = resonanceEntries[0] ?? null;
  const restResonance = resonanceEntries.slice(1);
  const challengeScore = typeof catScores.challenge === 'number' ? catScores.challenge : null;
  const overallScore = computeOverallScore(catScores, relType);
  const tier = resolveTier(overallScore, language);
  // Each resonance dimension can draw a short teaser from the lead card of its
  // own chapter — the signature gets a full supporting paragraph, the tiles get
  // one sentence — so the cards carry meaning instead of a redundant glyph tail.
  const sectionLeadBody = (catKey: string): string | undefined => {
    const key = (CATEGORY_TO_SECTION[catKey] || []).find((k) => reading[k]);
    return key ? (reading[key] as SynastrySectionData | undefined)?.cards?.[0]?.body?.[0] : undefined;
  };
  // The signature card headlines with its chapter's lead-card TITLE (2-4 words)
  // rather than the category caption — the caption often wraps to a second line.
  const sectionLeadTitle = (catKey: string): string | undefined => {
    const key = (CATEGORY_TO_SECTION[catKey] || []).find((k) => reading[k]);
    return key ? (reading[key] as SynastrySectionData | undefined)?.cards?.[0]?.title : undefined;
  };
  const sigDetail = signatureEntry ? sectionLeadBody(signatureEntry[0]) : undefined;
  const sigHeadline = signatureEntry ? sectionLeadTitle(signatureEntry[0]) : undefined;

  const [deletedAccountOpen, setDeletedAccountOpen] = useState(false);
  const openChart = useCallback(async (slug: string) => {
    try {
      const res = await fetch(
        `/api/reading/exists?slug=${encodeURIComponent(slug)}`,
        { credentials: 'include' },
      );
      const data = (await res.json().catch(() => null)) as { exists?: boolean } | null;
      if (data?.exists) {
        window.location.href = `/r/${slug}`;
      } else {
        setDeletedAccountOpen(true);
      }
    } catch {
      window.location.href = `/r/${slug}`;
    }
  }, []);

  return (
    <>
      <div style={{ height: '56px' }} />
      <div className="ct">
        {/* Breadcrumb — grid keeps the active "Synastry" tab centered on the page */}
        <div className="bnav">
          <div className="bnav-side bnav-l">
            <button className="bb" onClick={() => viewerSlug ? openChart(viewerSlug) : onBackToNatal?.()}>
              ← {language === 'ka' ? 'ჩემი რუკა' : 'My Chart'}
            </button>
          </div>
          <button className="bb active">
            <span>{language === 'ka' ? 'სინასტრია' : 'Synastry'}</span>
          </button>
          <div className="bnav-side bnav-r">
            <button
              type="button"
              className="bb"
              disabled={!otherSlug}
              onClick={() => otherSlug && openChart(otherSlug)}
              style={!otherSlug ? { opacity: 0.45, cursor: 'default' } : undefined}
            >
              {chartPossessive(otherPerson.name, language)}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="chero section-reveal vis">
          <div className="chero-glow" />
          <SynastryAspectWheel
            chartA={viewerChart}
            chartB={otherChart}
            nameA={viewerPerson.name}
            nameB={otherPerson.name}
            genderA={viewerPerson.gender}
            genderB={otherPerson.gender}
            language={language}
          />
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
          <PartnerCard person={viewerPerson} isYou language={language} chart={viewerChart ?? undefined} shareSlug={viewerSlug ?? undefined} onOpenChart={openChart} />
          <div className="bridge">
            <div className="bridge-line" />
            <div className="bridge-icon">
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(201,168,76,.3)" strokeWidth="1" />
              </svg>
            </div>
            <div className="bridge-line" />
          </div>
          <PartnerCard person={otherPerson} language={language} chart={otherChart ?? undefined} shareSlug={otherSlug ?? undefined} onOpenChart={openChart} />
        </div>

        {/* Resonance — dimensions lead, the overall score resolves last */}
        {signatureEntry && (
          <>
            <div className="rzn-head section-reveal vis">
              <h2>{language === 'ka' ? 'როგორ ერგებით ერთმანეთს' : 'How you resonate'}</h2>
            </div>

            <SignatureCard
              catKey={signatureEntry[0]}
              label={catLabels[signatureEntry[0]] || signatureEntry[0]}
              score={signatureEntry[1] as number}
              caption={catCaptions[signatureEntry[0]]}
              headline={sigHeadline}
              detail={sigDetail}
              language={language}
              onJump={() => scrollToCategory(signatureEntry[0])}
            />

            {restResonance.length > 0 && (
              <div className="rzn-grid section-reveal vis">
                {restResonance.map(([key, score]) => (
                  <ResonanceTile
                    key={key}
                    catKey={key}
                    label={catLabels[key] || key}
                    score={score as number}
                    caption={catCaptions[key]}
                    detail={sectionLeadBody(key)}
                    language={language}
                    onJump={() => scrollToCategory(key)}
                  />
                ))}
              </div>
            )}

            {challengeScore != null && (
              <GrowthEdge
                score={challengeScore}
                caption={catCaptions['challenge']}
                language={language}
                onJump={() => scrollToCategory('challenge')}
              />
            )}

            <DeepResonance score={overallScore} tier={tier} language={language} onJump={scrollToPotential} />
          </>
        )}

        {/* Section Navigation — mirrors the natal reading's nav structure:
            a full-bleed sticky bar (.snav, like .nb) wrapping an inset
            horizontal scroll track (.snav-track, like .nb .ct). The inner
            track is what scrolls, so pills clip at the content margin, not the
            screen edge. */}
        <nav className="snav" role="tablist">
          <div className="snav-track" ref={navRef}>
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
          </div>
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

      {deletedAccountOpen && (
        <DeletedAccountModal language={language} onClose={() => setDeletedAccountOpen(false)} />
      )}
    </>
  );
}

function DeletedAccountModal({ language, onClose }: { language: Language; onClose: () => void }) {
  return (
    <div className="dam-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dam-card" onClick={(e) => e.stopPropagation()}>
        <div className="dam-sigil" aria-hidden>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(201,168,76,.25)" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(201,168,76,.12)" strokeWidth=".6" strokeDasharray="2 4" />
            <path d="M35 35 L65 65 M65 35 L35 65" stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
          </svg>
        </div>
        <h3 className="dam-title">
          {language === 'ka' ? 'რუკა აღარ არსებობს' : 'Chart no longer exists'}
        </h3>
        <p className="dam-body">
          {language === 'ka'
            ? 'ამ მომხმარებელმა წაშალა ანგარიში. მისი რუკა აღარ არის ხელმისაწვდომი.'
            : 'This person has deleted their account. Their chart is no longer available.'}
        </p>
        <button type="button" className="dam-cta" onClick={onClose}>
          {language === 'ka' ? 'გასაგებია' : 'OK'}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ──

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
  onOpenChart,
}: {
  person: { name: string; sun: string; moon: string; asc: string };
  isYou?: boolean;
  language: Language;
  chart?: ChartPersonData;
  shareSlug?: string;
  onOpenChart?: (slug: string) => void;
}) {
  // Card shows the full name from the users table; the reading's meta name is
  // first-name-only (kept that way for the prose).
  const displayName = (chart?.fullName ?? '').trim() || person.name;
  const initial = displayName.charAt(0).toUpperCase();

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

  const handleCardClick = shareSlug && onOpenChart ? () => onOpenChart(shareSlug) : undefined;

  return (
    <div className="pc" onClick={handleCardClick} style={shareSlug ? { cursor: 'pointer' } : undefined}>
      {isYou && <div className="pc-you-dot" />}
      {isYou && <div className="pc-tooltip">{language === 'ka' ? 'ჩემი რუკა →' : 'My Chart →'}</div>}
      {!isYou && shareSlug && <div className="pc-other-tag">{chartPossessive(person.name, language)}</div>}
      <div className="pc-avatar"><span className="pc-avatar-letter">{initial}</span></div>
      <div className="pc-name">{displayName}</div>
      <div className="pc-sub">{
        formatBirthDate(chart?.birth, language)
        ?? renderText(`${localizeSign(person.sun, language)} · ${localizeSign(person.moon, language)} · ${localizeSign(person.asc, language)}`)
      }</div>
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

// ── Deep Resonance — the derived overall score, resolving AFTER the dimensions ──
function DeepResonance({ score, tier, language, onJump }: { score: number; tier: TierResult; language: Language; onJump: () => void }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="rzn-chord section-reveal vis"
      role="button" tabIndex={0} onClick={onJump} onKeyDown={jumpKeyHandler(onJump)}
    >
      <div className="rzn-ring">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth="6" />
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
        <div className="rzn-ring-num">{score}</div>
      </div>
      <div className="rzn-chord-txt">
        <div className="rzn-tier">{tier.label}</div>
        <div className="rzn-tier-desc">{tier.description}</div>
        <div className="rzn-method">
          {language === 'ka' ? 'ექვსივე განზომილების შეწონილი ჯამი' : 'A weighted blend of all six dimensions'}
        </div>
        <div className="rzn-chord-explore">
          {language === 'ka' ? 'პოტენციალის თავში გადასვლა →' : 'Explore the potential →'}
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

// ── Synastry aspect wheel — a bi-wheel of the two charts with the REAL
// cross-chart aspects drawn between them. The stored chart aspects are each
// person's own natal aspects, so the cross-aspects are computed here from both
// sets of planet longitudes. ──
const ZODIAC_ORDER = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const WHEEL_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
const PLANET_UNI: Record<string, string> = {
  Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇',
};
const CROSS_ASPECTS: { angle: number; orb: number; cls: 'harmony' | 'tension' | 'magnetic' }[] = [
  { angle: 0,   orb: 7, cls: 'magnetic' },
  { angle: 180, orb: 7, cls: 'tension' },
  { angle: 120, orb: 6, cls: 'harmony' },
  { angle: 90,  orb: 6, cls: 'tension' },
  { angle: 60,  orb: 4, cls: 'harmony' },
];
const ASPECT_STROKE: Record<string, string> = { harmony: 'var(--earth)', tension: 'var(--fire)', magnetic: 'var(--gold)' };

function planetLongitude(sign: string, degree: string): number | null {
  const idx = ZODIAC_ORDER.indexOf((sign || '').trim().toLowerCase());
  if (idx < 0) return null;
  const m = (degree || '').match(/(\d+)\s*[°º]\s*(\d+)?/);
  const d = m ? parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0) : 0;
  return idx * 30 + d;
}

interface WheelPoint { name: string; sign: string; lon: number; ang: number }

// Nudge glyphs apart so overlapping planets stay legible, while keeping their
// real order and rough longitude. Iterative relaxation to a minimum angular gap.
function spreadAngles(points: { name: string; sign: string; lon: number }[], minGap: number): WheelPoint[] {
  const arr: WheelPoint[] = points.map((p) => ({ ...p, ang: p.lon })).sort((a, b) => a.ang - b.ang);
  if (arr.length < 2) return arr;
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], b = arr[(i + 1) % arr.length];
      let gap = b.ang - a.ang;
      if (gap < 0) gap += 360;
      if (gap < minGap) {
        const push = (minGap - gap) / 2 + 0.01;
        a.ang = (a.ang - push + 360) % 360;
        b.ang = (b.ang + push) % 360;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return arr;
}

function SynastryAspectWheel({ chartA, chartB, nameA, nameB, genderA, genderB, language }: {
  chartA?: ChartPersonData | null; chartB?: ChartPersonData | null;
  nameA: string; nameB: string; genderA?: string; genderB?: string; language: Language;
}) {
  // Hovered planet → floating tooltip (SVG <title> never reliably fired). Positioned
  // as an HTML overlay at the glyph's fractional coords within the square canvas.
  const [hover, setHover] = useState<{ label: string; x: number; y: number; person: string; name: string } | null>(null);
  const toPoints = (chart?: ChartPersonData | null) =>
    (chart?.planets ?? [])
      .filter((p) => WHEEL_PLANETS.includes(p.name))
      .map((p) => ({ name: p.name, sign: p.sign, lon: planetLongitude(p.sign, p.degree) }))
      .filter((p): p is { name: string; sign: string; lon: number } => p.lon != null);

  const rawA = toPoints(chartA);
  const rawB = toPoints(chartB);
  if (rawA.length < 3 || rawB.length < 3) return null;

  const cx = 150, cy = 150, rA = 122, rB = 84;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const posAng = (ang: number, r: number): [number, number] => {
    const rad = (ang * Math.PI) / 180;
    return [r2(cx + r * Math.sin(rad)), r2(cy - r * Math.cos(rad))];
  };

  // Displayed (spread) angles — glyphs use these; aspects classify by true lon.
  const As = spreadAngles(rawA, 15);
  const Bs = spreadAngles(rawB, 15);
  const angA = (name: string) => As.find((p) => p.name === name)?.ang ?? 0;
  const angB = (name: string) => Bs.find((p) => p.name === name)?.ang ?? 0;

  // Gender colours: female → pink, male → gold; same gender → the second goes blue.
  const base = (g?: string) => (g === 'female' ? 'var(--rose)' : 'var(--gold)');
  const colA = base(genderA);
  let colB = base(genderB);
  if (colA === colB) colB = '#6f95bd';

  const PERSONAL = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']);
  const cand: { ax: number; ay: number; bx: number; by: number; cls: string; tight: boolean; delta: number; aName: string; bName: string }[] = [];
  for (const a of rawA) {
    for (const b of rawB) {
      if (!PERSONAL.has(a.name) && !PERSONAL.has(b.name)) continue;
      let diff = Math.abs(a.lon - b.lon);
      if (diff > 180) diff = 360 - diff;
      for (const asp of CROSS_ASPECTS) {
        const delta = Math.abs(diff - asp.angle);
        if (delta <= asp.orb) {
          const [ax, ay] = posAng(angA(a.name), rA);
          const [bx, by] = posAng(angB(b.name), rB);
          cand.push({ ax, ay, bx, by, cls: asp.cls, tight: delta < 2, delta, aName: a.name, bName: b.name });
          break;
        }
      }
    }
  }
  const lines = cand.sort((x, y) => x.delta - y.delta).slice(0, 16);

  // Hover a planet → light its own threads + the planets they reach, dim the rest.
  const connected = new Set<string>();
  if (hover) {
    connected.add(`${hover.person}:${hover.name}`);
    for (const l of lines) {
      if (hover.person === 'a' && l.aName === hover.name) connected.add(`b:${l.bName}`);
      if (hover.person === 'b' && l.bName === hover.name) connected.add(`a:${l.aName}`);
    }
  }
  const lineActive = (l: { aName: string; bName: string }) =>
    !hover || (hover.person === 'a' && l.aName === hover.name) || (hover.person === 'b' && l.bName === hover.name);

  const planetTip = (person: string, p: WheelPoint) => {
    const pl = language === 'ka' ? (PLANET_KA[p.name] || p.name) : p.name;
    return `${person} · ${pl} — ${localizeSign(p.sign, language)}`;
  };
  const renderGlyphs = (pts: WheelPoint[], r: number, color: string, person: string, key: string) =>
    pts.map((p, i) => {
      const [x, y] = posAng(p.ang, r);
      const dim = !!hover && !connected.has(`${key}:${p.name}`);
      return (
        <g
          key={`${key}${i}`}
          className="syn-planet"
          style={{ cursor: 'help', opacity: dim ? 0.18 : 1 }}
          onMouseEnter={() => setHover({ label: planetTip(person, p), x, y, person: key, name: p.name })}
          onMouseLeave={() => setHover(null)}
        >
          {/* transparent, larger hit-area so the tooltip is easy to trigger */}
          <circle cx={x} cy={y} r="12" fill="transparent" />
          <circle cx={x} cy={y} r="8.5" fill="var(--bg,#0b0b13)" opacity="0.55" style={{ pointerEvents: 'none' }} />
          <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="12.5" fill={color} fontFamily="serif" style={{ pointerEvents: 'none' }}>{PLANET_UNI[p.name]}</text>
        </g>
      );
    });

  return (
    <div className="syn-wheel section-reveal vis">
      <div className="syn-wheel-canvas">
        <svg viewBox="0 0 300 300" role="img" aria-label={language === 'ka' ? 'სინასტრიის ასპექტების რუკა' : 'Synastry aspect wheel'}>
          <circle cx={cx} cy={cy} r={rA + 8} fill="none" stroke="rgba(201,168,76,.12)" strokeWidth=".6" />
          <circle cx={cx} cy={cy} r={rB - 8} fill="none" stroke="rgba(201,168,76,.08)" strokeWidth=".6" />
          {Array.from({ length: 12 }).map((_, i) => {
            const [x1, y1] = posAng(i * 30, rB - 8);
            const [x2, y2] = posAng(i * 30, rA + 8);
            return <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(201,168,76,.05)" strokeWidth=".5" />;
          })}
          {lines.map((l, i) => {
            const active = lineActive(l);
            const baseOp = l.tight ? 0.5 : 0.28;
            const op = !hover ? baseOp : active ? Math.min(1, baseOp + 0.45) : baseOp * 0.14;
            const sw = hover && active ? (l.tight ? 1.5 : 1.1) : l.tight ? 1.1 : 0.7;
            return (
              <line key={`l${i}`} className="syn-aspect-line" x1={l.ax} y1={l.ay} x2={l.bx} y2={l.by}
                pathLength={1} stroke={ASPECT_STROKE[l.cls]} strokeLinecap="round"
                style={{ ['--i' as never]: i, opacity: op, strokeWidth: sw }} />
            );
          })}
          {renderGlyphs(As, rA, colA, nameA, 'a')}
          {renderGlyphs(Bs, rB, colB, nameB, 'b')}
        </svg>
        {hover && (
          <div
            className="syn-wheel-tip"
            style={{ left: `${(hover.x / 300) * 100}%`, top: `${(hover.y / 300) * 100}%` }}
          >
            {hover.label}
          </div>
        )}
      </div>
      <div className="syn-wheel-legend">
        <span className="swl-item"><i className="swl-dot" style={{ background: colA }} />{nameA}</span>
        <span className="swl-item"><i className="swl-dot" style={{ background: colB }} />{nameB}</span>
        <span className="swl-sep" />
        <span className="swl-item"><i className="swl-line" style={{ background: 'var(--earth)' }} />{language === 'ka' ? 'ჰარმონია' : 'Harmony'}</span>
        <span className="swl-item"><i className="swl-line" style={{ background: 'var(--fire)' }} />{language === 'ka' ? 'დაძაბულობა' : 'Tension'}</span>
      </div>
    </div>
  );
}

// Shared Enter/Space handler so every score card is keyboard-operable.
function jumpKeyHandler(onJump: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJump(); }
  };
}

// Captions are "<insight> · <aspect glyphs>". Split them so the prose reads as
// prose and the aspect signature renders as a deliberate, muted tail — not a
// technical patch stapled to the end of a sentence.
const ASPECT_TAIL_RE = /^[\s·☉☽☿♀♂♃♄♅♆♇⚸☊☋⚷♈♉♊♋♌♍♎♏♐♑♒♓☌☍△□⚹]+$/u;
function splitCaption(caption?: string): { prose: string; aspect: string } {
  if (!caption) return { prose: '', aspect: '' };
  const idx = caption.lastIndexOf('·');
  if (idx > 0) {
    const after = caption.slice(idx + 1).trim();
    if (after && ASPECT_TAIL_RE.test(after)) {
      return { prose: caption.slice(0, idx).trim(), aspect: after };
    }
  }
  return { prose: caption.trim(), aspect: '' };
}

// First sentence of a paragraph — used to give each tile a short, concrete
// teaser drawn from its chapter's lead card (the symbols already live in the
// full reading, so the opening cards carry meaning, not notation).
function firstSentence(text?: string): string {
  if (!text) return '';
  const t = text.trim();
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

// Keep the crossReferences hover popup short regardless of how long the model
// made it — trim to ~1-2 sentences at a clean boundary.
function capPopup(s: string): string {
  const MAX = 240;
  if (s.length <= MAX) return s;
  const slice = s.slice(0, MAX);
  const punct = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  if (punct > 120) return s.slice(0, punct + 1).trim();
  const sp = slice.lastIndexOf(' ');
  return (sp > 120 ? s.slice(0, sp) : slice).trim() + '…';
}

// The single strongest resonance dimension, rendered large with its insight.
// Reuses meta.categoryCaptions[key] — no new data required.
function SignatureCard({ catKey, label, score, caption, headline, detail, language, onJump }: {
  catKey: string; label: string; score: number; caption?: string; headline?: string; detail?: string; language: Language; onJump: () => void;
}) {
  const el = CAT_TO_ELEMENT[catKey] || 'var(--gold)';
  const { prose } = splitCaption(caption);
  // Prefer the chapter's short lead-card title; fall back to the caption hook.
  const insight = headline || prose;
  return (
    <div
      className="rzn-sig section-reveal vis"
      role="button" tabIndex={0} onClick={onJump} onKeyDown={jumpKeyHandler(onJump)}
      style={{ ['--el' as never]: el }}
    >
      <div className="rzn-sig-stat">
        <div className="rzn-sig-eyebrow">{language === 'ka' ? 'ყველაზე ძლიერი განზომილება' : 'Strongest dimension'}</div>
        <div className="rzn-sig-cat">{renderText(label)}</div>
        <div className="rzn-sig-num">{score}<small>/100</small></div>
      </div>
      <div className="rzn-sig-body">
        {insight && <div className="rzn-sig-ins">{renderText(insight)}</div>}
        {detail && <p className="rzn-sig-detail">{renderText(capPopup(detail))}</p>}
        <div className="rzn-sig-explore">{language === 'ka' ? 'ამ თავში გადასვლა →' : 'Explore this chapter →'}</div>
      </div>
    </div>
  );
}

// A remaining resonance dimension — compact tile, element-coloured, jumps to its chapter.
// Teaser = the caption hook + one concrete sentence from its chapter's lead card.
function ResonanceTile({ catKey, label, score, caption, detail, language, onJump }: {
  catKey: string; label: string; score: number; caption?: string; detail?: string; language: Language; onJump: () => void;
}) {
  const el = CAT_TO_ELEMENT[catKey] || 'var(--gold)';
  const { prose } = splitCaption(caption);
  const cont = firstSentence(detail);
  return (
    <div
      className="rzn-tile"
      role="button" tabIndex={0} onClick={onJump} onKeyDown={jumpKeyHandler(onJump)}
      style={{ ['--el' as never]: el }}
    >
      <div className="rzn-tile-top">
        <span className="rzn-tile-nm">{renderText(label)}</span>
        <span className="rzn-tile-sc">{score}</span>
      </div>
      <div className="rzn-tile-bar"><div className="rzn-tile-fill" style={{ width: `${score}%` }} /></div>
      {prose && <div className="rzn-tile-cap">{renderText(prose)}</div>}
      {cont && <div className="rzn-tile-detail">{renderText(cont)}</div>}
      <div className="rzn-tile-jump">{renderText(label)} →</div>
    </div>
  );
}

// Challenge, reframed. Deliberately NOT a fill bar (a filling bar reads as
// "more = better", a landmine for friction). Segmented intensity meter instead.
function GrowthEdge({ score, caption, language, onJump }: {
  score: number; caption?: string; language: Language; onJump: () => void;
}) {
  const filled = Math.max(1, Math.min(5, Math.round(score / 20)));
  const { prose } = splitCaption(caption);
  return (
    <div
      className="rzn-edge section-reveal vis"
      role="button" tabIndex={0} onClick={onJump} onKeyDown={jumpKeyHandler(onJump)}
    >
      <span className="rzn-edge-icon"><svg><use href="#gl-sparkle" /></svg></span>
      <div className="rzn-edge-main">
        <div className="rzn-edge-lab">{language === 'ka' ? 'ზრდის წერტილი' : 'Growth edge'}</div>
        {prose && <div className="rzn-edge-cap">{renderText(prose)}</div>}
        <div className="rzn-edge-link">{language === 'ka' ? 'ჩრდილის თავში გადასვლა →' : 'Explore the shadow chapter →'}</div>
      </div>
      <div className="rzn-edge-right">
        <div className="rzn-edge-intensity">
          <span className="n">{score}</span>
          <span className="l">{language === 'ka' ? 'ინტენსივობა' : 'friction intensity'}</span>
        </div>
        <div className="rzn-edge-dots" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < filled ? 'dot on' : 'dot'} />)}
        </div>
      </div>
    </div>
  );
}

// ── Section renderer — uses .sh / .sh h2 / .st / .pq (natal pattern) ──

// Per-section header glyphs (user-selected, thin gold line style like natal).
const svgProps = { viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const SECTION_GLYPHS: Record<string, React.ReactNode> = {
  emotionalBond: (<svg {...svgProps}><path d="M21 11a11 11 0 1 0 0 26 9 9 0 0 1 0-26z" /><path d="M27 11a11 11 0 1 1 0 26 9 9 0 0 0 0-26z" /></svg>),
  passion: (<svg {...svgProps}><path d="M24 7c5 7 9 9 9 15a9 9 0 0 1-18 0c0-3.5 2-6 3.6-8 .9 3.4 3.4 3.4 3.4 1 0-3-1-5.5 2-8z" /></svg>),
  karmic: (<svg {...svgProps}><path d="M24 26C20 26 20 21 24 21 29 21 29 28 24 28 16 28 16 17 24 17 34 17 34 32 24 32" /></svg>),
  numerology: (<svg viewBox="0 0 48 48" fill="none"><text x="12" y="16" fontFamily="Cormorant Garamond,serif" fontSize="12" fill="currentColor" opacity=".35">7</text><text x="9" y="36" fontFamily="Cormorant Garamond,serif" fontSize="24" fill="currentColor">4</text><text x="26" y="27" fontFamily="Cormorant Garamond,serif" fontSize="16" fill="currentColor" opacity=".55">9</text></svg>),
  growth: (<svg {...svgProps}><path d="M24 39V21" /><path d="M24 27c-6.5 0-9.5-3-9.5-8.5 5.5 0 9.5 2 9.5 8.5z" /><path d="M24 23c6.5 0 9.5-3 9.5-8-5.5 0-9.5 2-9.5 8z" /></svg>),
  sharedShadow: (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="24" cy="24" r="12" /><path d="M24 12a12 12 0 0 1 0 24z" fill="currentColor" stroke="none" /></svg>),
  dailyRitual: (<svg {...svgProps}><circle cx="24" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="31" cy="15" r="1.6" fill="currentColor" stroke="none" /><circle cx="34" cy="22" r="1.6" fill="currentColor" stroke="none" /><circle cx="31" cy="29" r="1.6" fill="currentColor" stroke="none" /><circle cx="17" cy="29" r="1.6" fill="currentColor" stroke="none" /><circle cx="14" cy="22" r="1.6" fill="currentColor" stroke="none" /><circle cx="17" cy="15" r="1.6" fill="currentColor" stroke="none" /><path d="M24 32v4" /><path d="M21 40l3-4 3 4" /></svg>),
  potential: (<svg {...svgProps}><line x1="24" y1="7" x2="24" y2="16" /><line x1="24" y1="32" x2="24" y2="41" /><line x1="7" y1="24" x2="16" y2="24" /><line x1="32" y1="24" x2="41" y2="24" /><line x1="14.5" y1="14.5" x2="19.5" y2="19.5" /><line x1="33.5" y1="14.5" x2="28.5" y2="19.5" /><line x1="14.5" y1="33.5" x2="19.5" y2="28.5" /><line x1="33.5" y1="33.5" x2="28.5" y2="28.5" /><path d="M24 19.5l3.8 4.5-3.8 4.5-3.8-4.5z" fill="currentColor" stroke="none" /></svg>),
  // Friend-only chapters — closest-match defaults.
  intellectualSynergy: (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="19" cy="24" r="8" /><circle cx="29" cy="24" r="8" /></svg>),
  sharedAdventures: (<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"><circle cx="24" cy="24" r="13" /><path d="M24 24l7.5-9.5-4.5 12.5-9.5 4.5 4.5-12.5z" fill="currentColor" stroke="none" /></svg>),
};

const SynastrySection = React.forwardRef<HTMLElement, {
  sectionId: string;
  section: SynastrySectionData;
  language: Language;
}>(function SynastrySection({ sectionId, section, language }, ref) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const secKey = sectionId.replace(/^syn-/, '');

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
        {SECTION_GLYPHS[secKey] && <div className="section-icon">{SECTION_GLYPHS[secKey]}</div>}
        <h2>{renderText(section.sectionTitle)}</h2>
        {(section.sectionSubtitle || section.sectionTagline) && (
          <div className="st">{renderText(section.sectionSubtitle || section.sectionTagline || '')}</div>
        )}
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
  const crossRefPopup = hasCrossRefs ? capPopup(crossRefsArray.join(' · ')) : undefined;

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
