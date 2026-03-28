// ============================================================
// SynastryRenderer — Renders synastry reading JSON into UI
// Supports both Couple and Friend variants
// ============================================================

'use client';

import React, { useState } from 'react';
import type { SynastryReading, SynastryCard, CategoryScore } from '@/types/synastry';

interface SynastryRendererProps {
  reading: SynastryReading;
  language: 'ka' | 'en';
}

export default function SynastryRenderer({
  reading,
  language,
}: SynastryRendererProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const activeSection = reading.sections[activeIdx];

  return (
    <div className="synastry-renderer">
      {/* Compatibility score */}
      <div className="compat-score-ring">
        <span className="compat-score__value">{reading.meta.compatibilityScore}</span>
        <span className="compat-score__label">
          {language === 'ka' ? 'თავსებადობა' : 'Compatibility'}
        </span>
      </div>

      {/* Category scores */}
      {reading.meta.categoryScores && (
        <div className="category-scores">
          {reading.meta.categoryScores.map((cat, i) => (
            <CategoryScoreBadge key={i} score={cat} language={language} />
          ))}
        </div>
      )}

      {/* Section nav */}
      <nav className="synastry-nav" role="tablist">
        {reading.sections.map((sec, i) => (
          <button
            key={sec.id}
            role="tab"
            aria-selected={activeIdx === i}
            className={`synastry-nav__tab ${activeIdx === i ? 'active' : ''}`}
            onClick={() => setActiveIdx(i)}
            style={activeIdx === i ? { color: sec.iconColor } : undefined}
          >
            <svg width="16" height="16"><use href={`#${sec.icon}`} /></svg>
            <span>{sec.title}</span>
          </button>
        ))}
      </nav>

      {/* Active section */}
      {activeSection && (
        <div className="synastry-section">
          <header className="section-header">
            <h2 className="section-title">{activeSection.title}</h2>
            <p className="section-tagline">{activeSection.tagline}</p>
          </header>

          {activeSection.cards.map((card, i) => (
            <SynastryCardComponent
              key={`${activeSection.id}-${i}`}
              card={card}
              expanded={expandedCards.has(`${activeSection.id}-${i}`)}
              onToggleExpand={() => toggleExpand(`${activeSection.id}-${i}`)}
            />
          ))}

          {activeSection.pullQuote && (
            <blockquote className="pull-quote">{activeSection.pullQuote}</blockquote>
          )}
        </div>
      )}
    </div>
  );
}

function SynastryCardComponent({
  card,
  expanded,
  onToggleExpand,
}: {
  card: SynastryCard;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <article
      className={`synastry-card ${expanded ? 'expanded' : ''}`}
      data-aspect={card.aspectTag}
    >
      <div className="card-header">
        <span className={`aspect-tag aspect-tag--${card.aspectTag || 'neutral'}`}>
          {card.badge}
        </span>
        <h3 className="card-title">{card.title}</h3>
      </div>

      <div className="card-body">
        {card.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {card.crossReferences && card.crossReferences.length > 0 && (
        <div className="card-crossrefs">
          {card.crossReferences.map((ref, i) => (
            <p key={i} className="crossref">{ref}</p>
          ))}
        </div>
      )}

      {card.expandedContent && card.expandedContent.length > 0 && (
        <>
          <button className="card-expand-btn" onClick={onToggleExpand}>
            {expanded ? '−' : '+'}
          </button>
          {expanded && (
            <div className="card-expanded">
              {card.expandedContent.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
        </>
      )}

      {card.hint && (
        <div className="card-hint">
          <span className="hint-title">{card.hint.title}</span>
          <p className="hint-content">{card.hint.content}</p>
          {card.hint.bullets && (
            <ul className="hint-bullets">
              {card.hint.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function CategoryScoreBadge({
  score,
  language,
}: {
  score: CategoryScore;
  language: 'ka' | 'en';
}) {
  return (
    <div className="category-badge" style={{ borderColor: score.color }}>
      <span className="category-badge__score">{score.score}</span>
      <span className="category-badge__name">
        {language === 'ka' ? score.name : score.nameEn}
      </span>
    </div>
  );
}
