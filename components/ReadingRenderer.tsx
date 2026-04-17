// ============================================================
// ReadingRenderer — Converts Claude's JSON reading into card UI
// This is the bridge between the AI pipeline and the visual layout.
//
// Architecture:
//   NatalReading JSON (from DB) → ReadingRenderer → Card-based UI
//
// Responsibilities:
//   1. Iterate over 8 sections of the reading
//   2. Render each Card with label, title, body paragraphs,
//      cross-references, expandable content, hints, accent elements
//   3. Handle content gating (locked sections for free/invited users)
//   4. Render the planet table + aspects in the overview section
//   5. Support language switching (reading data is already pre-generated)
// ============================================================

'use client';

import React, { useState } from 'react';
import type {
  NatalReading,
  OverviewSection,
  ContentSection,
  Card,
  PlanetRow,
  Aspect,
  SectionKey,
} from '@/types/reading';
import { SECTION_KEYS } from '@/types/reading';
import { canAccessSection, type User, PRICING } from '@/types/user';
import { SECTION_ICONS, ELEMENT_COLORS } from '@/lib/utils/constants';
import { renderText, setRenderLang, ELEMENT_CSS_CLASS } from '@/lib/utils/renderText';
import type { Lang } from '@/lib/utils/translations';

// ── Helpers ──

function stripSectionPrefix(title: string): string {
  const idx = title.indexOf(': ');
  return idx !== -1 ? title.slice(idx + 2) : title;
}

// ── Props ──

interface ReadingRendererProps {
  reading: NatalReading;
  user: User;
  language: Lang;
  onUpgrade?: () => void;
}

// ── Main component ──

export default function ReadingRenderer({
  reading,
  user,
  language,
  onUpgrade,
}: ReadingRendererProps) {
  setRenderLang(language);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const currentSection = reading[activeSection];
  const isLocked = !canAccessSection(user, activeSection);

  return (
    <div className="reading-renderer">
      {/* Section navigation tabs */}
      <nav className="reading-nav" role="tablist">
        {SECTION_KEYS.map((key) => {
          const accessible = canAccessSection(user, key);
          return (
            <button
              key={key}
              role="tab"
              aria-selected={activeSection === key}
              className={`reading-nav__tab ${activeSection === key ? 'active' : ''} ${!accessible ? 'locked' : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <svg className="reading-nav__icon" width="16" height="16">
                <use href={`#${SECTION_ICONS[key]}`} />
              </svg>
              <span>{getSectionTitle(reading, key)}</span>
              {!accessible && <span className="reading-nav__lock">&#128274;</span>}
            </button>
          );
        })}
      </nav>

      {/* Section content */}
      <div className="reading-section" data-section={activeSection}>
        {isLocked ? (
          <LockedSection
            sectionKey={activeSection}
            section={currentSection}
            user={user}
            language={language}
            onUpgrade={onUpgrade}
          />
        ) : activeSection === 'overview' ? (
          <OverviewRenderer
            section={reading.overview}
            expandedCards={expandedCards}
            onToggleExpand={toggleExpand}
          />
        ) : (
          <ContentRenderer
            section={currentSection as ContentSection}
            expandedCards={expandedCards}
            onToggleExpand={toggleExpand}
          />
        )}
      </div>
    </div>
  );
}

// ── Overview section (with planet table + aspects) ──

function OverviewRenderer({
  section,
  expandedCards,
  onToggleExpand,
}: {
  section: OverviewSection;
  expandedCards: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="reading-overview">
      <header className="section-header">
        <h2 className="section-title">{stripSectionPrefix(section.sectionTitle)}</h2>
        <p className="section-tagline">{section.sectionTagline}</p>
      </header>

      {/* Planet table */}
      {section.planetTable && section.planetTable.length > 0 && (
        <div className="planet-table-wrap">
          <table className="planet-table">
            <tbody>
              {section.planetTable.map((row, i) => (
                <PlanetRowComponent key={i} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aspects */}
      {section.aspects && section.aspects.length > 0 && (
        <div className="aspects-grid">
          {section.aspects.map((aspect, i) => (
            <AspectBadge key={i} aspect={aspect} />
          ))}
        </div>
      )}

      {/* Core cards */}
      {section.coreCards?.map((card) => (
        <CardComponent
          key={card.id}
          card={card}
          expanded={expandedCards.has(card.id)}
          onToggleExpand={() => onToggleExpand(card.id)}
        />
      ))}

      {section.pullQuote && (
        <blockquote className="pull-quote">{renderText(section.pullQuote)}</blockquote>
      )}
    </div>
  );
}

// ── Content section (sections 2-8) ──

function ContentRenderer({
  section,
  expandedCards,
  onToggleExpand,
}: {
  section: ContentSection;
  expandedCards: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="reading-content">
      <header className="section-header">
        <h2 className="section-title">{stripSectionPrefix(section.sectionTitle)}</h2>
        <p className="section-tagline">{section.sectionTagline}</p>
      </header>

      {section.cards?.map((card) => (
        <CardComponent
          key={card.id}
          card={card}
          expanded={expandedCards.has(card.id)}
          onToggleExpand={() => onToggleExpand(card.id)}
        />
      ))}

      {section.pullQuote && (
        <blockquote className="pull-quote">{renderText(section.pullQuote)}</blockquote>
      )}
    </div>
  );
}

// ── Individual card ──

function CardComponent({
  card,
  expanded,
  onToggleExpand,
}: {
  card: Card;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const elClass = card.accentElement ? ELEMENT_CSS_CLASS[card.accentElement] || '' : '';
  const hasCrossRefs = card.crossReferences && card.crossReferences.length > 0;
  const crossRefPopup = hasCrossRefs ? card.crossReferences.join(' · ') : undefined;

  return (
    <article
      className={`c reading-card ${elClass} ${expanded ? 'expanded' : ''}`}
      data-element={card.accentElement}
      style={card.accentElement ? {
        borderLeftColor: ELEMENT_COLORS[card.accentElement],
      } : undefined}
    >
      {/* Card header */}
      <div className="card-header">
        <span className={`card-label ${hasCrossRefs ? 'has-popup' : ''}`}>
          {card.label}
          {hasCrossRefs && (
            <span className="label-popup">{crossRefPopup}</span>
          )}
        </span>
        <h3 className="card-title">{renderText(card.title)}</h3>
      </div>

      {/* Body paragraphs */}
      <div className="card-body">
        {card.body.map((paragraph, i) => (
          <p key={i}>{renderText(paragraph)}</p>
        ))}
      </div>

      {/* Expandable content */}
      {card.expandedContent && card.expandedContent.length > 0 && (
        <>
          <button
            className="card-expand-btn"
            onClick={onToggleExpand}
            aria-expanded={expanded}
          >
            {expanded ? '−' : '+'}
          </button>
          {expanded && (
            <div className="card-expanded">
              {card.expandedContent.map((para, i) => (
                <p key={i}>{renderText(para)}</p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Hint */}
      {card.hint && (
        <div className="card-hint h">
          <span className="hint-title">{renderText(card.hint.title)}</span>
          <p className="hint-content">{renderText(card.hint.content)}</p>
          {card.hint.bullets && (
            <ul className="hint-bullets">
              {card.hint.bullets.map((b, i) => (
                <li key={i}>{renderText(b)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

// ── Planet row in overview table ──

function PlanetRowComponent({ row }: { row: PlanetRow }) {
  return (
    <tr className="planet-row" data-element={row.element}>
      <td className="planet-cell">
        <svg width="14" height="14"><use href={`#gl-${row.planet.toLowerCase()}`} /></svg>
        <span>{row.planet}</span>
        {row.retrograde && (
          <span
            className="tip retro"
            data-tip={getRenderLang() === 'ka' ? 'რეტროგრადული — ინტერნალიზებული ენერგია' : 'Retrograde — internalized energy'}
          >℞</span>
        )}
      </td>
      <td className="sign-cell">
        <span>{row.sign}</span>
      </td>
      <td className="degree-cell">{row.degree}</td>
      <td className="house-cell">{row.house}</td>
    </tr>
  );
}

// ── Aspect badge ──

function aspectNatureClass(type: string): string {
  if (type === 'conjunction') return 'al-conj';
  if (type === 'trine' || type === 'sextile') return 'al-harm';
  return 'al-tens';
}

function AspectBadge({ aspect }: { aspect: Aspect }) {
  const [open, setOpen] = useState(false);
  const hasInterp = !!aspect.interpretation;
  const natureClass = aspectNatureClass(aspect.aspectType);

  const row = (
    <div className={`al ${natureClass}${hasInterp ? ' al-hi' : ''}`}>
      <span className="al-p">{aspect.planet1}</span>
      <span className="asy">{aspect.aspectSymbol}</span>
      <span className="al-p">{aspect.planet2}</span>
      <div className="alb">
        <span className="al-type">{aspect.aspectType.toUpperCase()}</span>
        {aspect.orb !== undefined && <span className="al-orb">{aspect.orb}°</span>}
      </div>
      {hasInterp && <span className="al-star">★</span>}
    </div>
  );

  if (!hasInterp) return row;

  return (
    <div
      className={`ai-entry ${natureClass}`}
      onClick={() => setOpen(o => !o)}
      style={{ cursor: 'pointer' }}
    >
      {row}
      {open && (
        <div className="ai-body">
          <p>{aspect.interpretation}</p>
        </div>
      )}
    </div>
  );
}

// ── Locked section teaser ──

function LockedSection({
  section,
  user,
  language,
  onUpgrade,
}: {
  sectionKey: SectionKey;
  section: OverviewSection | ContentSection;
  user: User;
  language: Lang;
  onUpgrade?: () => void;
}) {
  const price = user.account_type === 'invited'
    ? PRICING.natal_unlock
    : PRICING.premium_upgrade;

  const ctaText = language === 'ka'
    ? `სრული წაკითხვის განბლოკვა — ₾${price}`
    : `Unlock full reading — ₾${price}`;

  return (
    <div className="locked-section">
      <header className="section-header">
        <h2 className="section-title">{stripSectionPrefix(section.sectionTitle)}</h2>
        <p className="section-tagline">{section.sectionTagline}</p>
      </header>

      {/* Teaser: show first card badge + title, blurred body */}
      {'cards' in section && section.cards?.[0] && (
        <div className="locked-teaser">
          <div className="teaser-card">
            <span className="card-label">{section.cards[0].label}</span>
            <h3 className="card-title">{section.cards[0].title}</h3>
            <div className="teaser-blur">
              <p>{(t => t.length > 120 ? t.slice(0, 120).replace(/\s\S*$/, '') + '…' : t)(section.cards[0].body[0] ?? '')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="locked-cta-area">
        <button className="btn-unlock" onClick={onUpgrade}>
          {ctaText}
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──

function getSectionTitle(reading: NatalReading, key: SectionKey): string {
  const section = reading[key];
  if ('sectionTitle' in section) return section.sectionTitle;
  return key;
}
