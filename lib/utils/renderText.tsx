/**
 * renderText — text rendering utilities for natal/synastry readings.
 * Stub: converts markdown-like formatting to React elements.
 */

import React from 'react';

let currentLang: 'ka' | 'en' = 'ka';

export function setRenderLang(lang: 'ka' | 'en') {
  currentLang = lang;
}

export function getRenderLang() {
  return currentLang;
}

/** Map element names to CSS class names */
export const ELEMENT_CSS_CLASS: Record<string, string> = {
  fire: 'af',
  earth: 'ae',
  air: 'aa',
  water: 'aw',
  Fire: 'af',
  Earth: 'ae',
  Air: 'aa',
  Water: 'aw',
};

/**
 * Convert a plain-text string (possibly with **bold** and *italic*) to React nodes.
 */
export function renderText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  // Split by **bold** and *italic* markers
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[1]}</strong>);
    } else if (match[2]) {
      // *italic*
      parts.push(<em key={match.index}>{match[2]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
