'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Language } from '@/types/user';

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
}

export interface SynastryReadingData {
  meta: SynastryMeta;
  [sectionKey: string]: unknown;
}

// Section key order for couple vs friend
const COUPLE_SECTIONS = ['emotionalBond', 'passion', 'karmic', 'numerology', 'growth', 'shadow', 'dailyRitual', 'potential'] as const;
const FRIEND_SECTIONS = ['emotionalBond', 'intellectualSynergy', 'karmic', 'numerology', 'growth', 'shadow', 'sharedAdventures', 'potential'] as const;

const SECTION_NAV_KA: Record<string, string> = {
  emotionalBond: 'ემოციური',
  passion: 'ვნება',
  karmic: 'კარმული',
  numerology: 'ნუმეროლოგია',
  growth: 'ზრდა',
  shadow: 'ჩრდილი',
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
  shadow: 'Shadow',
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

// ── Main Component ──

interface SynastryViewProps {
  reading: SynastryReadingData;
  language: Language;
  onBackToNatal?: () => void;
}

export default function SynastryView({ reading, language, onBackToNatal }: SynastryViewProps) {
  const isFriend = reading.meta.type === 'synastry_friend';
  const sectionKeys = isFriend ? FRIEND_SECTIONS : COUPLE_SECTIONS;
  const navLabels = language === 'ka' ? SECTION_NAV_KA : SECTION_NAV_EN;
  const catLabels = language === 'ka' ? CATEGORY_LABELS_KA : CATEGORY_LABELS_EN;

  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll-aware section tracking
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

  const scrollToSection = useCallback((idx: number) => {
    setActiveSection(idx);
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Extract sections
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
        <div className="chero section-reveal">
          <div className="chero-glow" />
          <SigilSVG />
          <h1>{heroTitle}</h1>
          <div className="tg">{heroSub}</div>
        </div>

        {/* Partner Cards */}
        <div className="pcards section-reveal">
          <PartnerCard person={meta.personA} isYou language={language} />
          <div className="bridge">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(201,168,76,.3)" strokeWidth="1" />
              <text x="20" y="24" textAnchor="middle" fill="var(--gold)" fontSize="14" fontFamily="serif">☌</text>
            </svg>
          </div>
          <PartnerCard person={meta.personB} language={language} />
        </div>

        {/* Compatibility Wheel */}
        <CompatibilityWheel score={meta.compatibilityScore} language={language} />

        {/* Category Scores */}
        <div className="cats section-reveal">
          {Object.entries(meta.categoryScores).map(([key, score]) => (
            <CategoryBar key={key} label={catLabels[key] || key} score={score as number} />
          ))}
        </div>

        {/* Section Navigation */}
        <div className="snav" ref={navRef}>
          {sections.map((s, i) => (
            <button
              key={s.key}
              className={`snb${activeSection === i ? ' active' : ''}`}
              onClick={() => scrollToSection(i)}
            >
              {navLabels[s.key] || s.key}
            </button>
          ))}
        </div>

        {/* Sections */}
        {sections.map((s, i) => (
          <SynastrySection
            key={s.key}
            ref={(el) => { sectionRefs.current[i] = el; }}
            section={s.data}
            language={language}
          />
        ))}

        {/* Footer */}
        <footer className="rfooter">
          <div className="footer-brand">ASTROLO.GE</div>
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
      <div className="pc-sub">{person.sun} · {person.moon} · {person.asc}</div>
      <div className="pc-placements">
        <div className="pc-row">
          <span className="pc-row-label"><svg><use href="#gl-sun" /></svg></span>
          <span className="pc-row-val">{person.sun}</span>
        </div>
        <div className="pc-row">
          <span className="pc-row-label"><svg><use href="#gl-moon" /></svg></span>
          <span className="pc-row-val">{person.moon}</span>
        </div>
        <div className="pc-row">
          <span className="pc-row-label"><svg><use href="#gl-asc" /></svg></span>
          <span className="pc-row-val">{person.asc}</span>
        </div>
      </div>
    </div>
  );
}

function CompatibilityWheel({ score, language }: { score: number; language: Language }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="wheel-section section-reveal">
      <svg className="wheel-svg" viewBox="0 0 120 120" width="160" height="160">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(201,168,76,.08)" strokeWidth="6" />
        <circle
          className="wheel-arc"
          cx="60" cy="60" r="54"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="wheel-center">
        <div className="wheel-num">{score}</div>
        <div className="wheel-label">{language === 'ka' ? 'თავსებადობა' : 'Compatibility'}</div>
      </div>
    </div>
  );
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="cat">
      <span className="cat-name">{label}</span>
      <span className="cat-score">{score}%</span>
      <div className="cat-bar">
        <div
          className="cat-fill"
          style={{ width: `${score}%`, transition: 'width 1s ease-out' }}
        />
      </div>
    </div>
  );
}

// ── Section + Card ──

const SynastrySection = React.forwardRef<HTMLElement, {
  section: SynastrySectionData;
  language: Language;
}>(function SynastrySection({ section, language }, ref) {
  return (
    <section className="analysis-section" ref={ref}>
      <div className="section-head">
        <h2>{section.sectionTitle}</h2>
        {section.sectionSubtitle && <p className="section-tagline">{section.sectionSubtitle}</p>}
      </div>

      {section.cards.map((card, i) => (
        <SynastryCard key={card.id || i} card={card} language={language} />
      ))}

      {section.pullQuote && (
        <blockquote className="pull-quote">{section.pullQuote}</blockquote>
      )}
    </section>
  );
});

function SynastryCard({ card, language }: { card: SynastryCardData; language: Language }) {
  const [expanded, setExpanded] = useState(false);
  const elColor = card.elementColor || 'gold';
  const aspectClass = card.aspectType || 'harmony';

  return (
    <div className={`card el-${elColor}`}>
      {/* Badge / Label */}
      <div className="card-badge">
        <span className={`aspect-tag ${aspectClass}`}>
          {aspectClass === 'harmony' ? '●' : aspectClass === 'tension' ? '▲' : '◆'}
          {' '}{card.label}
        </span>
      </div>

      <h3>{card.title}</h3>

      {/* Body paragraphs */}
      {card.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      {/* Cross-references */}
      {card.crossReferences && card.crossReferences.length > 0 && (
        <div className="card-crossrefs">
          {card.crossReferences.map((ref, i) => (
            <small key={i} style={{ display: 'block', color: 'var(--txd)', marginTop: '4px', fontSize: '.8rem' }}>
              ↳ {ref}
            </small>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {card.expandedContent && card.expandedContent.length > 0 && (
        <>
          <button
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? (language === 'ka' ? 'დახურვა ↑' : 'Collapse ↑')
              : (language === 'ka' ? 'სიღრმისეულად ↓' : 'Explore deeper ↓')}
          </button>
          {expanded && (
            <div className="expandable show">
              {card.expandedContent.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hint box */}
      {card.hint && (
        <div className="hint">
          <div className="hint-head">
            <span className="hint-icon">✦</span>
            <span className="hint-title">{card.hint.title}</span>
          </div>
          <p>{card.hint.content}</p>
          {card.hint.bullets && card.hint.bullets.length > 0 && (
            <ul className="hint-bullets">
              {card.hint.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
