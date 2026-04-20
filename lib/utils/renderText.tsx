// ============================================================
// Shared rich-text renderer for natal + synastry readings
// Handles bold, italic, chart points, retrograde, astro symbols
// ============================================================

import React from 'react';

// ── Symbol mappings ──

const SYMBOL_TO_GLYPH: Record<string, string> = {
  '☉':'sun','☽':'moon','☿':'mercury','♀':'venus','♂':'mars',
  '♃':'jupiter','♄':'saturn','♅':'uranus','♆':'neptune','♇':'pluto',
  '⚸':'lilith','☊':'node','☋':'node',
  '♈':'aries','♉':'taurus','♊':'gemini','♋':'cancer','♌':'leo','♍':'virgo',
  '♎':'libra','♏':'scorpio','♐':'sagittarius','♑':'capricorn','♒':'aquarius','♓':'pisces',
  // Aspect symbols
  '☌':'conjunction','☍':'opposition','△':'trine','□':'square','⚹':'sextile',
  // AI-generated emoji variants → mapped to existing glyphs
  '🔱':'asc','⬆':'asc','↑':'asc',
};
const PLANET_SET = new Set(['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','⚸','☊','☋']);
// Aspect symbols rendered in the same gold tone as planets
const ASPECT_SET = new Set(['☌','☍','△','□','⚹']);
const SIGN_ELEMENT: Record<string, string> = {
  aries:'fire',taurus:'earth',gemini:'air',cancer:'water',leo:'fire',virgo:'earth',
  libra:'air',scorpio:'water',sagittarius:'fire',capricorn:'earth',aquarius:'air',pisces:'water',
};

// Tokenizer: bold, italic, chart points (ASC/MC/IC), retrograde ℞, astro Unicode symbols,
// and element words (Georgian stems + English) with optional trailing "(NN%)".
//
// Group layout:
//   1: **bold**
//   2: _italic_
//   3: ASC|MC|IC|DSC
//   4: ℞ symbol
//   5: astrological unicode glyph
//   6: full element word match  (e.g. "ცეცხლი (48%)" or "Water")
//   7: element word itself       (e.g. "ცეცხლი", "Water")
//   8: optional percentage       (e.g. "48")
//   9: retrograde word (English "retrograde" or Georgian core "რეტროგრად") → rendered as ℞; Georgian suffix stays as plain text
//  10: AI-output "(R)" shorthand → rendered as ℞
//
// Georgian stems: ცეცხლ (fire) / მიწ (earth) / ჰაერ (air) / წყალ (water)
// Matches any Georgian ending [ა-ჰ]* after the stem — so ცეცხლი / ცეცხლის / წყალში all work.
// Water has two stems in Georgian: წყალ (nominative) and წყლ (genitive — წყლის, წყლისა, წყლით…)
// Order matters: წყალ before წყლ so the longer match wins on "წყალისა".
const TEXT_TOKEN_RE = /\*\*(.+?)\*\*|(?<!\w)_(.+?)_(?!\w)|\b(ASC|MC|IC|DSC)\b|(℞)|([☉☽☿♀♂♃♄♅♆♇⚸☊☋♈♉♊♋♌♍♎♏♐♑♒♓☌☍△□⚹🔱⬆↑])|(((?<![ა-ჰ])(?:ცეცხლ|მიწ|ჰაერ|წყალ|წყლ)[ა-ჰ]*|\b(?:fire|earth|air|water)\b)(?:\s*\(\s*(\d{1,3})\s*%?\s*\))?)|(\bretrograde\b|(?<![ა-ჰ])რეტროგრად)|(\(R\))/giu;

/** Classify the stem of an element word to its CSS modifier */
function getElementClass(word: string): string | null {
  const w = word.toLowerCase();
  // English
  if (/^fire$/.test(w)) return 'fire';
  if (/^earth$/.test(w)) return 'earth';
  if (/^air$/.test(w)) return 'air';
  if (/^water$/.test(w)) return 'water';
  // Georgian stems (any ending) — water has two stems: წყალ- and წყლ-
  if (/^ცეცხლ/.test(word)) return 'fire';
  if (/^მიწ/.test(word)) return 'earth';
  if (/^ჰაერ/.test(word)) return 'air';
  if (/^წყალ/.test(word) || /^წყლ/.test(word)) return 'water';
  return null;
}

// Element tooltip strings (shown on hover via .tip::after)
const ELEMENT_TIP_KA: Record<string, string> = {
  fire: 'ცეცხლი — მოქმედება, ვნება, სითამამე',
  earth: 'მიწა — სტაბილურობა, პრაქტიკა, საფუძველი',
  air: 'ჰაერი — აზრი, კომუნიკაცია, იდეები',
  water: 'წყალი — ემოცია, ინტუიცია, სიღრმე',
};
const ELEMENT_TIP_EN: Record<string, string> = {
  fire: 'Fire — action, passion, courage',
  earth: 'Earth — stability, practicality, grounding',
  air: 'Air — thought, communication, ideas',
  water: 'Water — emotion, intuition, depth',
};

const PT_TIPS_EN: Record<string, string> = {
  ASC: 'Ascendant — outer mask & first impression',
  MC: 'Midheaven — career & public role',
  IC: 'Imum Coeli — roots & private self',
  DSC: 'Descendant — the mirror & partnerships',
};
const PT_TIPS_KA: Record<string, string> = {
  ASC: 'ასცენდენტი — გარეგანი ნიღაბი და პირველი შთაბეჭდილება',
  MC: 'ცის შუაწერტილი — კარიერა და საჯარო როლი',
  IC: 'ცის ფსკერი — ფესვები და შინაგანი სამყარო',
  DSC: 'დესცენდენტი — სარკე და პარტნიორობა',
};

const SIGN_TIPS_EN: Record<string, string> = {
  aries:       'Aries — initiative, courage, raw drive',
  taurus:      'Taurus — stability, sensuality, persistence',
  gemini:      'Gemini — intellect, duality, curiosity',
  cancer:      'Cancer — feeling, memory, nurturing',
  leo:         'Leo — radiance, pride, creative fire',
  virgo:       'Virgo — precision, service, discernment',
  libra:       'Libra — balance, beauty, partnership',
  scorpio:     'Scorpio — depth, transformation, intensity',
  sagittarius: 'Sagittarius — expansion, truth, freedom',
  capricorn:   'Capricorn — ambition, structure, mastery',
  aquarius:    'Aquarius — innovation, ideals, community',
  pisces:      'Pisces — compassion, dissolution, the dream',
};
const SIGN_TIPS_KA: Record<string, string> = {
  aries:       'ვერძი — ინიციატივა, სიმამაცე, ძალა',
  taurus:      'კურო — სტაბილურობა, სიამოვნება, გამძლეობა',
  gemini:      'ტყუპები — ინტელექტი, ორმაგობა, ცნობისმოყვარეობა',
  cancer:      'კირჩხიბი — გრძნობა, მეხსიერება, ზრუნვა',
  leo:         'ლომი — სხივოსნება, სიამაყე, შემოქმედება',
  virgo:       'ქალწული — სიზუსტე, სამსახური, გამჭრიახობა',
  libra:       'სასწორი — ბალანსი, სილამაზე, პარტნიორობა',
  scorpio:     'მორიელი — სიღრმე, ტრანსფორმაცია, ინტენსიობა',
  sagittarius: 'მშვილდოსანი — გაფართოება, ჭეშმარიტება, თავისუფლება',
  capricorn:   'თხის რქა — ამბიცია, სტრუქტურა, დაოსტატება',
  aquarius:    'მერწყული — სიახლე, იდეალები, თემი',
  pisces:      'თევზები — თანაგრძნობა, გახსნა, ოცნება',
};

export type RenderLang = 'ka' | 'en';

/** Module-level language for renderText (set via setRenderLang before rendering) */
let _renderLang: RenderLang = 'ka';

export function setRenderLang(lang: RenderLang) {
  _renderLang = lang;
}

export function getRenderLang(): RenderLang {
  return _renderLang;
}

/**
 * Render rich text with bold, italic, astrological symbols, chart points, and retrograde markers.
 * Call setRenderLang() before rendering to set tooltip language.
 */
export function renderText(text: string): React.ReactNode {
  if (!text) return null;
  const ptTips = _renderLang === 'ka' ? PT_TIPS_KA : PT_TIPS_EN;
  const retroTip = _renderLang === 'ka' ? 'რეტროგრადული — ინტერნალიზებული ენერგია' : 'Retrograde — internalized energy';
  const nodes: React.ReactNode[] = [];
  let last = 0; let k = 0;
  TEXT_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TEXT_TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const savedIdx1 = TEXT_TOKEN_RE.lastIndex;
      const inner1 = renderText(m[1]);
      TEXT_TOKEN_RE.lastIndex = savedIdx1;
      nodes.push(<strong key={k++}>{inner1}</strong>);
    } else if (m[2] !== undefined) {
      const savedIdx2 = TEXT_TOKEN_RE.lastIndex;
      const inner2 = renderText(m[2]);
      TEXT_TOKEN_RE.lastIndex = savedIdx2;
      nodes.push(<em key={k++} className="hl">{inner2}</em>);
    } else if (m[3] !== undefined) {
      nodes.push(<span key={k++} className="pt tip" data-tip={ptTips[m[3]]}>{m[3]}</span>);
    } else if (m[4] !== undefined) {
      nodes.push(<span key={k++} className="retro tip" data-tip={retroTip} style={{cursor:'help'}}>℞</span>);
    } else if (m[5] !== undefined) {
      const ch = m[5]; const glyph = SYMBOL_TO_GLYPH[ch];
      if (glyph) {
        const isSign = !PLANET_SET.has(ch) && !ASPECT_SET.has(ch);
        const elKey = SIGN_ELEMENT[glyph] || '';
        const cls = isSign ? `gi gi-${elKey}` : 'gi gi-pl';
        if (isSign) {
          const signTips = _renderLang === 'ka' ? SIGN_TIPS_KA : SIGN_TIPS_EN;
          const tip = signTips[glyph];
          nodes.push(<span key={k++} className={`${cls} tip`} data-tip={tip} style={{cursor:'help'}}><svg><use href={`#gl-${glyph}`}/></svg></span>);
        } else {
          nodes.push(<span key={k++} className={cls}><svg><use href={`#gl-${glyph}`}/></svg></span>);
        }
      } else nodes.push(ch);
    } else if (m[6] !== undefined) {
      const rawWord = (m[7] ?? '').trim();
      const pct = m[8];
      const el = getElementClass(rawWord);
      if (el) {
        const tip = (_renderLang === 'ka' ? ELEMENT_TIP_KA : ELEMENT_TIP_EN)[el];
        nodes.push(
          <span key={k++} className={`gel gel-${el} tip`} data-tip={tip}>
            <span className="gel-w">{rawWord}</span>
            {pct !== undefined && <span className="gel-p">({pct}%)</span>}
          </span>
        );
      } else {
        nodes.push(m[6]);
      }
    } else if (m[9] !== undefined) {
      nodes.push(<span key={k++} className="retro tip" data-tip={retroTip} style={{cursor:'help'}}>℞</span>);
      if (/[ა-ჰ]/u.test(text[m.index + m[0].length] ?? '')) nodes.push('-');
    } else if (m[10] !== undefined) {
      nodes.push(<span key={k++} className="retro tip" data-tip={retroTip} style={{cursor:'help'}}>℞</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length === 1 ? nodes[0] : nodes;
}

// ── Element CSS helpers ──

export const ELEMENT_CSS_CLASS: Record<string, string> = {
  fire: 'af', earth: 'ae', air: 'aa', water: 'aw',
  Fire: 'af', Earth: 'ae', Air: 'aa', Water: 'aw',
  rose: 'ar', shadow: 'as', gold: 'ag',
};
