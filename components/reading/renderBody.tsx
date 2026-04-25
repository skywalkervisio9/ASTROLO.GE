// ============================================================
// renderBody — React port of prototype-runtime.js _buildBodyHtml.
//
// Two modes match the prototype:
//   renderSimpleBody   — for Card.body paragraphs (prose only,
//                        inline numerals → ● bullets, arrows stripped)
//   renderExpanded     — for Card.expandedContent (full list detection:
//                        `1. **Title:** body` → .cl table rows,
//                        `**Header:**` → .cl-intro decorative divider)
// ============================================================

import React, { type ReactNode } from 'react';
import { renderText } from '@/lib/utils/renderText';

// ── Label/badge renderer (mirrors prototype's _buildBadgeHtml) ──
// Unicode astro symbols → SVG glyphs, ℞ stays plain, aspect symbols get
// surrounding whitespace. Unlike renderText, does NOT wrap ASC/MC/IC/DSC
// in tooltip pills — labels stay plain text so the badge layout holds.

const LABEL_SYMBOL_TO_GLYPH: Record<string, string> = {
  '☉':'sun','☽':'moon','☿':'mercury','♀':'venus','♂':'mars',
  '♃':'jupiter','♄':'saturn','♅':'uranus','♆':'neptune','♇':'pluto',
  '⚸':'lilith','☊':'node','☋':'node',
  '♈':'aries','♉':'taurus','♊':'gemini','♋':'cancer','♌':'leo','♍':'virgo',
  '♎':'libra','♏':'scorpio','♐':'sagittarius','♑':'capricorn','♒':'aquarius','♓':'pisces',
};
const LABEL_PLANET_SET = new Set(['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','⚸','☊','☋']);
const LABEL_SIGN_ELEMENT: Record<string, string> = {
  aries:'fire',taurus:'earth',gemini:'air',cancer:'water',leo:'fire',virgo:'earth',
  libra:'air',scorpio:'water',sagittarius:'fire',capricorn:'earth',aquarius:'air',pisces:'water',
};
const LABEL_ASPECT_SET = new Set(['☌','△','□','☍','⚹']);

export function renderLabel(label: string): ReactNode {
  if (!label) return null;
  const chars = Array.from(label);
  const out: ReactNode[] = [];
  let run = '';
  let k = 0;

  const flushRun = () => {
    if (run) { out.push(run); run = ''; }
  };

  for (const ch of chars) {
    if (LABEL_SYMBOL_TO_GLYPH[ch]) {
      flushRun();
      const glyph = LABEL_SYMBOL_TO_GLYPH[ch];
      const cls = LABEL_PLANET_SET.has(ch) ? 'gi gi-pl' : `gi gi-${LABEL_SIGN_ELEMENT[glyph] || ''}`;
      out.push(
        <span key={k++} className={cls}>
          <svg><use href={`#gl-${glyph}`}/></svg>
        </span>
      );
    } else if (ch === '℞') {
      run += ' ℞';
    } else if (LABEL_ASPECT_SET.has(ch)) {
      run += ` ${ch} `;
    } else {
      run += ch;
    }
  }
  flushRun();
  return out;
}

// ── Simple body (card prose) ──

export function renderSimpleBody(text: string): ReactNode {
  if (!text) return null;
  const cleaned = text.replace(/\s*→\s*/g, ' ');
  const out: ReactNode[] = [];
  const re = /\b\d+[.)]\s/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > last) out.push(<React.Fragment key={k++}>{renderText(cleaned.slice(last, m.index))}</React.Fragment>);
    out.push(<span key={k++} className="dn">●</span>);
    last = m.index + m[0].length;
  }
  if (last < cleaned.length) out.push(<React.Fragment key={k++}>{renderText(cleaned.slice(last))}</React.Fragment>);
  return out.length ? out : null;
}

// ── Expanded content (two-column tables + decorative dividers) ──

function flattenParagraphs(arr: string[]): string[] {
  const flat: string[] = [];
  (arr || []).forEach(s => {
    if (!s) return;
    if (s.indexOf('\n') !== -1) {
      s.split('\n').forEach(l => { if (l.trim()) flat.push(l.trim()); });
    } else {
      flat.push(s);
    }
  });
  return flat;
}

function renderClRow(content: string, key: number): ReactNode {
  const cleanContent = content.replace(/^\d+\.\s+/, '');
  let title = '';
  let body = cleanContent;

  const boldMatch = cleanContent.match(/^\*\*(.+?)\*\*:?\s*([\s\S]*)/);
  if (boldMatch) {
    title = boldMatch[1].replace(/:$/, '').trim();
    body = boldMatch[2];
  } else {
    const colonMatch = cleanContent.match(/^([^:.\n]{3,55}):\s+([\s\S]*)/);
    if (colonMatch) {
      title = colonMatch[1];
      body = colonMatch[2];
    }
  }

  if (title) {
    const parenMatch = title.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    const titleNode = parenMatch ? (
      <>
        <span className="cl-t-main">{renderText(parenMatch[1].trim())}</span>
        <span className="cl-t-sub">{renderText(parenMatch[2].trim())}</span>
      </>
    ) : renderText(title);
    return (
      <div key={key} className="cl-row">
        <span className="cl-t">{titleNode}</span>
        <span className="cl-b">{renderText(body)}</span>
      </div>
    );
  }
  return (
    <div key={key} className="cl-row">
      <span className="cl-b cl-b-full">{renderText(cleanContent)}</span>
    </div>
  );
}

export function renderExpanded(arr: string[]): ReactNode[] {
  const flat = flattenParagraphs(arr);
  const nodes: ReactNode[] = [];
  let i = 0;
  let prevIntro = false;
  let key = 0;

  while (i < flat.length) {
    const s = flat[i];

    if (/^\d+\.\s/.test(s)) {
      const rows: ReactNode[] = [];
      while (i < flat.length && /^\d+\.\s/.test(flat[i])) {
        rows.push(renderClRow(flat[i], key++));
        i++;
      }
      nodes.push(<div key={key++} className="cl">{rows}</div>);
      prevIntro = false;
      continue;
    }

    // .cl-intro divider: line ending with ':' (4-65 chars), or any fully **…**-wrapped standalone line
    const trimmed = s.trim();
    const bare = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    const isColonHeader = /^[^.\n]{4,65}:\s*$/.test(bare);
    const isBoldHeader = /^\*\*[^*\n]+\*\*$/.test(trimmed) && bare.length >= 4 && bare.length <= 100;
    if (isColonHeader || isBoldHeader) {
      const headerText = isColonHeader ? bare.replace(/:\s*$/, '') : bare;
      const cleanText = renderText(headerText);
      if (prevIntro) {
        nodes.push(<p key={key++} className="cl-intro-sub">{cleanText}</p>);
        prevIntro = false;
      } else {
        nodes.push(
          <p key={key++} className="cl-intro">
            <span className="cl-dl"><i/><i/><i/></span>
            <span>{cleanText}</span>
            <span className="cl-dr"><i/><i/><i/></span>
          </p>
        );
        prevIntro = true;
      }
      i++;
      continue;
    }

    nodes.push(<p key={key++}>{renderText(s)}</p>);
    prevIntro = false;
    i++;
  }

  return nodes;
}
