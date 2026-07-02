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
// Short planet one-liners for hover tooltips on in-text planet symbols.
// Mirrors PLANET_TIPS_KA/EN in public/app-runtime.js — keep in sync.
const PLANET_TIPS_KA: Record<string, string> = {
  sun: 'მზე — იდენტობა, ეგო, სასიცოცხლო ძალა', moon: 'მთვარე — ემოცია, ინსტინქტი, შინაგანი სამყარო',
  mercury: 'მერკური — გონება, კომუნიკაცია, აზროვნება', venus: 'ვენერა — სიყვარული, ესთეტიკა, ღირებულებები',
  mars: 'მარსი — მოქმედება, ვნება, ნება', jupiter: 'იუპიტერი — ზრდა, სიუხვე, ბედი',
  saturn: 'სატურნი — სტრუქტურა, დისციპლინა, გაკვეთილები', uranus: 'ურანი — თავისუფლება, ინოვაცია, გამოღვიძება',
  neptune: 'ნეპტუნი — ოცნება, ინტუიცია, სულიერება', pluto: 'პლუტონი — ტრანსფორმაცია, ძალა, განახლება',
  lilith: 'ლილითი — ჩრდილი, პირველადი ინსტინქტი, ტაბუ', node: 'ჩრდილოეთის კვანძი — კარმული მიმართულება, ზრდის გზა',
  'south node': 'სამხრეთის კვანძი — კარმული წარსული, თანდაყოლილი გამოცდილება',
  chiron: 'ქირონი — ჭრილობა და განკურნება',
};
const PLANET_TIPS_EN: Record<string, string> = {
  sun: 'Sun — identity, ego, vitality', moon: 'Moon — emotion, instinct, inner world',
  mercury: 'Mercury — mind, communication, thought', venus: 'Venus — love, beauty, values',
  mars: 'Mars — action, drive, will', jupiter: 'Jupiter — growth, abundance, fortune',
  saturn: 'Saturn — structure, discipline, lessons', uranus: 'Uranus — freedom, innovation, awakening',
  neptune: 'Neptune — dreams, intuition, spirituality', pluto: 'Pluto — transformation, power, rebirth',
  lilith: 'Lilith — shadow, raw instinct, taboo', node: 'North Node — karmic direction, growth path',
  'south node': 'South Node — karmic past, innate gifts',
  chiron: 'Chiron — the wound and the healing',
};

/** Tooltip text for a planet SYMBOL in the current render language.
 *  ☋ South Node gets its own text (the glyph itself is the rotated node —
 *  render it with the gi-flip class). Returns undefined for non-planets. */
export function planetSymbolTip(ch: string): string | undefined {
  if (!PLANET_SET.has(ch)) return undefined;
  const glyph = SYMBOL_TO_GLYPH[ch];
  const key = ch === '☋' ? 'south node' : glyph;
  return (_renderLang === 'ka' ? PLANET_TIPS_KA : PLANET_TIPS_EN)[key];
}
// Aspect symbols rendered in the same gold tone as planets
const ASPECT_SET = new Set(['☌','☍','△','□','⚹']);
const SIGN_ELEMENT: Record<string, string> = {
  aries:'fire',taurus:'earth',gemini:'air',cancer:'water',leo:'fire',virgo:'earth',
  libra:'air',scorpio:'water',sagittarius:'fire',capricorn:'earth',aquarius:'air',pisces:'water',
};

export type ZodiacDisplayMode = 'icon' | 'name';

// Renderer emits both icon and name forms for every zodiac sign and chart-point
// token (wrapped in .zm-icon / .zm-name). The toggle is a CSS swap off
// body.zodiac-names — no re-render required. setZodiacDisplayMode is kept as a
// no-op for callers that still wire it up; remove once those callsites are gone.
export function setZodiacDisplayMode(_mode: ZodiacDisplayMode) {}

const SIGN_NAMES_EN: Record<string, string> = {
  aries:'Aries',taurus:'Taurus',gemini:'Gemini',cancer:'Cancer',leo:'Leo',virgo:'Virgo',
  libra:'Libra',scorpio:'Scorpio',sagittarius:'Sagittarius',capricorn:'Capricorn',aquarius:'Aquarius',pisces:'Pisces',
};

const SIGN_NAMES_KA: Record<string, { nom: string; gen: string; loc: string; dat: string; inst: string; adv: string; for: string; with: string; voc: string }> = {
  aries:{nom:'ვერძი',gen:'ვერძის',loc:'ვერძში',dat:'ვერძს',inst:'ვერძით',adv:'ვერძად',for:'ვერძისთვის',with:'ვერძთან',voc:'ვერძო'},
  taurus:{nom:'კურო',gen:'კუროს',loc:'კუროში',dat:'კუროს',inst:'კუროთი',adv:'კუროდ',for:'კუროსთვის',with:'კუროსთან',voc:'კურო'},
  gemini:{nom:'ტყუპები',gen:'ტყუპების',loc:'ტყუპებში',dat:'ტყუპებს',inst:'ტყუპებით',adv:'ტყუპებად',for:'ტყუპებისთვის',with:'ტყუპებთან',voc:'ტყუპებო'},
  cancer:{nom:'კირჩხიბი',gen:'კირჩხიბის',loc:'კირჩხიბში',dat:'კირჩხიბს',inst:'კირჩხიბით',adv:'კირჩხიბად',for:'კირჩხიბისთვის',with:'კირჩხიბთან',voc:'კირჩხიბო'},
  leo:{nom:'ლომი',gen:'ლომის',loc:'ლომში',dat:'ლომს',inst:'ლომით',adv:'ლომად',for:'ლომისთვის',with:'ლომთან',voc:'ლომო'},
  virgo:{nom:'ქალწული',gen:'ქალწულის',loc:'ქალწულში',dat:'ქალწულს',inst:'ქალწულით',adv:'ქალწულად',for:'ქალწულისთვის',with:'ქალწულთან',voc:'ქალწულო'},
  libra:{nom:'სასწორი',gen:'სასწორის',loc:'სასწორში',dat:'სასწორს',inst:'სასწორით',adv:'სასწორად',for:'სასწორისთვის',with:'სასწორთან',voc:'სასწორო'},
  scorpio:{nom:'მორიელი',gen:'მორიელის',loc:'მორიელში',dat:'მორიელს',inst:'მორიელით',adv:'მორიელად',for:'მორიელისთვის',with:'მორიელთან',voc:'მორიელო'},
  sagittarius:{nom:'მშვილდოსანი',gen:'მშვილდოსნის',loc:'მშვილდოსანში',dat:'მშვილდოსანს',inst:'მშვილდოსნით',adv:'მშვილდოსნად',for:'მშვილდოსნისთვის',with:'მშვილდოსანთან',voc:'მშვილდოსანო'},
  capricorn:{nom:'თხის რქა',gen:'თხის რქის',loc:'თხის რქაში',dat:'თხის რქას',inst:'თხის რქით',adv:'თხის რქად',for:'თხის რქისთვის',with:'თხის რქასთან',voc:'თხის რქავ'},
  aquarius:{nom:'მერწყული',gen:'მერწყულის',loc:'მერწყულში',dat:'მერწყულს',inst:'მერწყულით',adv:'მერწყულად',for:'მერწყულისთვის',with:'მერწყულთან',voc:'მერწყულო'},
  pisces:{nom:'თევზები',gen:'თევზების',loc:'თევზებში',dat:'თევზებს',inst:'თევზებით',adv:'თევზებად',for:'თევზებისთვის',with:'თევზებთან',voc:'თევზებო'},
};

const SIGN_SYMBOL_TO_KEY: Record<string, string> = {
  '♈':'aries','♉':'taurus','♊':'gemini','♋':'cancer','♌':'leo','♍':'virgo',
  '♎':'libra','♏':'scorpio','♐':'sagittarius','♑':'capricorn','♒':'aquarius','♓':'pisces',
};

function kaSignName(key: string, suffix = '') {
  const f = SIGN_NAMES_KA[key];
  if (!f) return key;
  const s = suffix.replace(/^-/, '');
  if (s === 'ის') return f.gen;
  if (s === 'ში') return f.loc;
  if (s === 'ს') return f.dat;
  if (s === 'ით') return f.inst;
  if (s === 'ად') return f.adv;
  if (s === 'სთვის' || s === 'თვის') return f.for;
  if (s === 'სთან' || s === 'თან') return f.with;
  if (s === 'ო') return f.voc;
  return f.nom;
}

export function renderZodiacSignToken(key: string, suffix = '', nodeKey?: React.Key): React.ReactNode {
  const elKey = SIGN_ELEMENT[key] || '';
  const signTips = _renderLang === 'ka' ? SIGN_TIPS_KA : SIGN_TIPS_EN;
  const tip = signTips[key];
  const nameLabel = _renderLang === 'ka' ? kaSignName(key, suffix) : SIGN_NAMES_EN[key] || key;

  return (
    <React.Fragment key={nodeKey}>
      <span className="zm-icon">
        <span className={`gi gi-${elKey} tip`} data-tip={tip} style={{cursor:'help'}}><svg><use href={`#gl-${key}`}/></svg></span>
        {suffix}
      </span>
      <span className={`zm-name zs zs-${elKey} tip`} data-tip={tip} style={{cursor:'help'}}>{nameLabel}</span>
    </React.Fragment>
  );
}

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
const TEXT_TOKEN_RE = /\*\*(.+?)\*\*|(?<!\w)_(.+?)_(?!\w)|\b(ASC|MC|IC|DSC)\b|(℞)|([♈♉♊♋♌♍♎♏♐♑♒♓])(-(?:სთვის|სთან|თვის|თან|ის|ში|ით|ად|ს|ო))?|([☉☽☿♀♂♃♄♅♆♇⚸☊☋☌☍△□⚹🔱⬆↑])|(((?<![ა-ჰ])(?:ცეცხლ|მიწ|ჰაერ|წყალ|წყლ)[ა-ჰ]*|\b(?:fire|earth|air|water)\b)(?:\s*\(\s*(\d{1,3})\s*%?\s*\))?)|(\bretrograde\b|(?<![ა-ჰ])რეტროგრად)|(\(R\))/giu;
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

const PT_NAMES_EN: Record<string, string> = {
  ASC: 'Ascendant', MC: 'Midheaven', IC: 'Imum Coeli', DSC: 'Descendant',
};
const PT_NAMES_KA: Record<string, string> = {
  ASC: 'ასცენდენტი', MC: 'ცის შუაწერტილი', IC: 'ცის ფსკერი', DSC: 'დესცენდენტი',
};

// For Georgian name-mode inflection. Each chart point splits into a fixed
// prefix ("ცის " for MC/IC) and an inflectable stem; the stem takes the case
// marker. The validator emits ABBR-suffix for oblique forms; this map turns
// the canonical pair back into a grammatical word (no literal hyphen).
const PT_STEMS_KA: Record<string, { prefix: string; stem: string }> = {
  ASC: { prefix: '', stem: 'ასცენდენტ' },
  DSC: { prefix: '', stem: 'დესცენდენტ' },
  MC: { prefix: 'ცის ', stem: 'შუაწერტილ' },
  IC: { prefix: 'ცის ', stem: 'ფსკერ' },
};

function kaChartPointInflect(key: string, suffix: string): string {
  const entry = PT_STEMS_KA[key];
  if (!entry) return key;
  const { prefix, stem } = entry;
  const s = suffix;
  if (!s) return prefix + stem + 'ი';
  if (s === 'ის') return prefix + stem + 'ის';
  if (s === 'ს') return prefix + stem + 'ს';
  if (s === 'ით') return prefix + stem + 'ით';
  if (s === 'ად') return prefix + stem + 'ად';
  if (s === 'მა' || s === 'მან') return prefix + stem + 'მა';
  if (s === 'ში') return prefix + stem + 'ში';
  if (s === 'სთვის' || s === 'თვის' || s === 'ისთვის') return prefix + stem + 'ისთვის';
  if (s === 'სთან' || s === 'თან' || s === 'ისთან') return prefix + stem + 'თან';
  if (s === 'ო') return prefix + stem + 'ო';
  return prefix + stem + 'ი';
}

const PT_SUFFIX_LOOKAHEAD_RE = /^-(ისთვის|ისთან|სთვის|სთან|თვის|თან|ში|ით|ად|მან|მა|ის|ს|ო)(?![ა-ჰ])/u;

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
  const retroTip = _renderLang === 'ka'
    ? 'რეტროგრადული — ინტერნალიზებული ენერგია'
    : 'Retrograde — internalized energy';

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let k = 0;

  TEXT_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TEXT_TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));

    if (m[1] !== undefined) {
      const savedIdx = TEXT_TOKEN_RE.lastIndex;
      const inner = renderText(m[1]);
      TEXT_TOKEN_RE.lastIndex = savedIdx;
      nodes.push(<strong key={k++}>{inner}</strong>);
    } else if (m[2] !== undefined) {
      const savedIdx = TEXT_TOKEN_RE.lastIndex;
      const inner = renderText(m[2]);
      TEXT_TOKEN_RE.lastIndex = savedIdx;
      nodes.push(<em key={k++} className="hl">{inner}</em>);
    } else if (m[3] !== undefined) {
      const ptKey = m[3];
      // Look ahead for a Georgian case suffix attached with a literal hyphen
      // (e.g. "ASC-თან", "MC-ის"). Validator normalizes inflected Georgian
      // chart-point words to this canonical form so we can re-inflect them
      // grammatically in name mode, or pass them through unchanged in icon mode.
      const tail = text.slice(m.index + m[0].length);
      const sufMatch = tail.match(PT_SUFFIX_LOOKAHEAD_RE);
      const suffix = sufMatch ? sufMatch[1] : '';
      const consumed = m[0].length + (sufMatch ? sufMatch[0].length : 0);

      const iconLabel = suffix ? `${ptKey}-${suffix}` : ptKey;
      const nameLabel = _renderLang === 'ka'
        ? kaChartPointInflect(ptKey, suffix)
        : (PT_NAMES_EN[ptKey] || ptKey);
      nodes.push(
        <span key={k++} className="pt tip" data-tip={ptTips[ptKey]}>
          <span className="zm-icon">{iconLabel}</span>
          <span className="zm-name">{nameLabel}</span>
        </span>
      );

      if (sufMatch) {
        last = m.index + consumed;
        TEXT_TOKEN_RE.lastIndex = last;
        continue;
      }
    } else if (m[4] !== undefined) {
      nodes.push(<span key={k++} className="retro tip" data-tip={retroTip} style={{cursor:'help'}}>℞</span>);
    } else if (m[5] !== undefined) {
      const signKey = SIGN_SYMBOL_TO_KEY[m[5]];
      nodes.push(renderZodiacSignToken(signKey, m[6] || '', k++));
    } else if (m[7] !== undefined) {
      const ch = m[7];
      const glyph = SYMBOL_TO_GLYPH[ch];

      if (glyph) {
        // Planet symbols get a hover tooltip; ☋ South Node reuses the node
        // glyph rotated 180° (astro convention) with its own tooltip text.
        const isSouth = ch === '☋';
        const tip = planetSymbolTip(ch);
        const cls = `gi gi-pl${isSouth ? ' gi-flip' : ''}${tip ? ' tip' : ''}`;
        nodes.push(
          <span key={k++} className={cls} {...(tip ? { 'data-tip': tip, style: { cursor: 'help' } } : {})}>
            <svg><use href={`#gl-${glyph}`}/></svg>
          </span>
        );
      } else {
        nodes.push(ch);
      }
    } else if (m[8] !== undefined) {
      const rawWord = (m[9] ?? '').trim();
      const pct = m[10];
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
        nodes.push(m[8]);
      }
    } else if (m[11] !== undefined) {
      nodes.push(<span key={k++} className="retro tip" data-tip={retroTip} style={{cursor:'help'}}>℞</span>);
      if (/[ა-ჰ]/u.test(text[m.index + m[0].length] ?? '')) nodes.push('-');
    } else if (m[12] !== undefined) {
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
