// ============================================================
// CardComponent — renders a single natal card into a prototype slot
// Structure MUST mirror prototype's _buildCard() exactly so existing
// CSS (.c, .b, .h, .ht, .ce, .tb2, .cl-dl, .cl-dr) keeps working.
// ============================================================

'use client';

import React, { useState } from 'react';
import type { Card } from '@/types/reading';
import { renderText, ELEMENT_CSS_CLASS } from '@/lib/utils/renderText';
import { renderSimpleBody, renderExpanded, renderLabel } from './renderBody';

interface Props {
  card: Card;
  lang: 'ka' | 'en';
}

export default function CardComponent({ card, lang }: Props) {
  const [expanded, setExpanded] = useState(false);

  const elClass = card.accentElement ? ELEMENT_CSS_CLASS[card.accentElement] || '' : '';
  const hasCrossRefs = !!card.crossReferences && card.crossReferences.length > 0;
  const hasExpanded = !!card.expandedContent && card.expandedContent.length > 0;

  const expandLabel = lang === 'ka' ? 'დეტალური ანალიზი ↓' : 'Detailed Analysis ↓';

  return (
    <div className={`c ${elClass}`.trim()}>
      <div className={`b${hasCrossRefs ? ' has-popup' : ''}`}>
        {renderLabel(card.label)}
        {hasCrossRefs && (
          <span className="label-popup">
            {card.crossReferences!.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && ' · '}
                {renderText(r)}
              </React.Fragment>
            ))}
          </span>
        )}
      </div>

      <h3>
        <span className="cl-dl"><i/><i/><i/></span>
        {card.title}
        <span className="cl-dr"><i/><i/><i/></span>
      </h3>

      {card.body?.map((p, i) => <p key={i}>{renderSimpleBody(p)}</p>)}

      {hasExpanded && (
        <>
          <button className="tb2" onClick={() => setExpanded(e => !e)}>
            {expandLabel}
          </button>
          <div className={`ce${expanded ? ' open' : ''}`}>
            {renderExpanded(card.expandedContent!)}
          </div>
        </>
      )}

      {card.hint && (
        <div className="h">
          <div className="ht">
            <svg><use href="#gl-sparkle"/></svg> {card.hint.title}
          </div>
          <p>{renderText(card.hint.content)}</p>
        </div>
      )}
    </div>
  );
}
