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
  elementColor: string;
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

// elementColor string → short-form accent class used by .c
const ELEMENT_ACCENT_CLASS: Record<string, string> = {
  fire: 'af',
  earth: 'ae',
  air: 'aa',
  water: 'aw',
  rose: 'ar',
  shadow: 'as',
  gold: 'ag',
};

// Aspect type → small colored symbol shown inside the .b badge
const ASPECT_BADGE: Record<string, { symbol: string; tone: string }> = {
  harmony: { symbol: '●', tone: 'var(--earth)' },
  tension: { symbol: '▲', tone: 'var(--fire)' },
  magnetic: { symbol: '◆', tone: 'var(--water)' },
};

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
}

export default function SynastryView({ reading, language, onBackToNatal }: SynastryViewProps) {
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

  const { meta } = reading;
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
          <button className="bb" onClick={onBackToNatal}>
            ← {language === 'ka' ? 'ჩემი რუკა' : 'My Chart'}
          </button>
          <span className="ndv">·</span>
          <button className="bb active">
            <svg style={{ width: '10px', height: '10px', fill: 'var(--gold)' }}><use href="#gl-conjunction" /></svg>
            <span>{language === 'ka' ? 'სინასტრია' : 'Synastry'}</span>
          </button>
          <span className="ndv">·</span>
          <button className="bb">
            {meta.personB.name} {language === 'ka' ? 'რუკა' : 'Chart'} →
          </button>
        </div>

        {/* Hero */}
        <div className="chero section-reveal vis">
          <div className="chero-glow" />
          <SigilSVG />
          <h1>{heroTitle}</h1>
          <div className="tg">{heroSub}</div>
        </div>

        {/* Partner Cards */}
        <div className="pcards section-reveal vis">
          <PartnerCard person={meta.personA} isYou language={language} />
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
          <PartnerCard person={meta.personB} language={language} />
        </div>

        {/* Compatibility Wheel */}
        <CompatibilityWheel score={meta.compatibilityScore} language={language} />

        {/* Category Scores */}
        <div className="cats section-reveal vis">
          {Object.entries(meta.categoryScores).map(([key, score]) => (
            <CategoryBar
              key={key}
              category={key}
              label={catLabels[key] || key}
              score={score as number}
              caption={meta.categoryCaptions?.[key]}
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

function PartnerCard({
  person,
  isYou,
  language,
}: {
  person: { name: string; sun: string; moon: string; asc: string };
  isYou?: boolean;
  language: Language;
}) {
  const initial = person.name.charAt(0).toUpperCase();
  return (
    <div className="pc">
      {isYou && <div className="pc-you-dot" />}
      {isYou && <div className="pc-tooltip">{language === 'ka' ? 'ჩემი რუკა →' : 'My Chart →'}</div>}
      <div className="pc-avatar"><span className="pc-avatar-letter">{initial}</span></div>
      <div className="pc-name">{person.name}</div>
      <div className="pc-sub">{renderText(`${localizeSign(person.sun, language)} · ${localizeSign(person.moon, language)} · ${localizeSign(person.asc, language)}`)}</div>
      <div className="pc-placements">
        <div className="pc-row">
          <span className="pc-row-label"><svg><use href="#gl-sun" /></svg>{language === 'ka' ? 'მზე' : 'Sun'}</span>
          <span className="pc-row-val">{renderText(localizeSign(person.sun, language))}</span>
        </div>
        <div className="pc-row">
          <span className="pc-row-label"><svg><use href="#gl-moon" /></svg>{language === 'ka' ? 'მთვარე' : 'Moon'}</span>
          <span className="pc-row-val">{renderText(localizeSign(person.moon, language))}</span>
        </div>
        <div className="pc-row">
          <span className="pc-row-label">ASC</span>
          <span className="pc-row-val">{renderText(localizeSign(person.asc, language))}</span>
        </div>
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

function CategoryBar({ category, label, score, caption }: { category: string; label: string; score: number; caption?: string }) {
  const tone = CAT_TO_ELEMENT[category] || 'var(--gold)';
  return (
    <div className="cat">
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
  const elClass = card.elementColor ? (ELEMENT_ACCENT_CLASS[card.elementColor] || '') : '';
  const hasCrossRefs = card.crossReferences && card.crossReferences.length > 0;
  const crossRefPopup = hasCrossRefs ? card.crossReferences.join(' · ') : undefined;
  const badge = ASPECT_BADGE[card.aspectType] || ASPECT_BADGE.harmony;

  return (
    <div className={`c ${elClass}`.trim()}>
      {/* Label badge — uses .b (matches natal), aspect symbol prefix */}
      <div className={`b${hasCrossRefs ? ' has-popup' : ''}`}>
        <span style={{ color: badge.tone }}>
          {badge.symbol}
        </span>
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
