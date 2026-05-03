// ============================================================
// buildFakeNatalReading — dev-only stub for the CALL1 PREMIUM path.
//
// Real Call 1 still runs (cheap chart analysis ~30s) so the row has a
// genuine analysis_en for synastry input later. Call 2 is replaced with
// a synthesized reading that:
//   - Passes the validator's section + min-card-count requirements
//   - Reuses the analysis text so cards have real-ish content
//   - Carries obvious FAKE markers in every visible field so a dev/test
//     user can never mistake it for a real reading
// ============================================================

import { SECTION_KEYS, type SectionKey } from '@/types/reading';

const FAKE_BANNER_KA = '⚠️ DEV ფეიკი — Call 2 გამოტოვებულია';
const FAKE_BANNER_EN = '⚠️ DEV FAKE — Call 2 skipped';

const SECTION_META: Record<SectionKey, { ka: { title: string; tagline: string }; en: { title: string; tagline: string } }> = {
  overview:        { ka: { title: 'პლანეტური მონახაზი',    tagline: 'FAKE READING' },                en: { title: 'Planetary Overview',      tagline: 'FAKE READING' } },
  mission:         { ka: { title: 'სულის მიმართულება',     tagline: 'FAKE READING' },                en: { title: "Your Soul's Direction",   tagline: 'FAKE READING' } },
  characteristics: { ka: { title: 'ძირეული ბუნება',        tagline: 'FAKE READING' },                en: { title: 'Your Core Nature',        tagline: 'FAKE READING' } },
  relationships:   { ka: { title: 'გულის ხელნაწერი',       tagline: 'FAKE READING' },                en: { title: "Your Heart's Blueprint",  tagline: 'FAKE READING' } },
  work:            { ka: { title: 'კარიერის გზა',           tagline: 'FAKE READING' },                en: { title: 'Your Career Path',        tagline: 'FAKE READING' } },
  shadow:          { ka: { title: 'ფარული სიძლიერე',       tagline: 'FAKE READING' },                en: { title: 'Your Hidden Strength',    tagline: 'FAKE READING' } },
  spiritual:       { ka: { title: 'სულის საჩუქარი',         tagline: 'FAKE READING' },                en: { title: "Your Soul's Gift",        tagline: 'FAKE READING' } },
  potential:       { ka: { title: 'უმაღლესი გამოხატულება', tagline: 'FAKE READING' },                en: { title: 'Your Highest Expression', tagline: 'FAKE READING' } },
};

// Validator min cards: overview 3, potential 2, all others 4.
const SECTION_CARD_COUNTS: Record<SectionKey, number> = {
  overview: 3, mission: 4, characteristics: 4, relationships: 4,
  work: 4, shadow: 4, spiritual: 4, potential: 2,
};

const ELEMENTS: Array<'fire' | 'earth' | 'air' | 'water'> = ['fire', 'earth', 'air', 'water'];

function chunkAnalysis(analysis: string, parts: number): string[] {
  const trimmed = (analysis || '').trim();
  if (!trimmed) return Array(parts).fill('');
  // Split into paragraphs first; if not enough, split by sentence.
  const paras = trimmed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const source = paras.length >= parts ? paras : trimmed.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  if (source.length === 0) return Array(parts).fill(trimmed);
  const chunks: string[] = [];
  const stride = Math.max(1, Math.ceil(source.length / parts));
  for (let i = 0; i < parts; i++) {
    const slice = source.slice(i * stride, (i + 1) * stride).join(' ').trim();
    chunks.push(slice || source[i % source.length]);
  }
  return chunks;
}

function buildFakeCard(
  sectionKey: SectionKey,
  idx: number,
  lang: 'ka' | 'en',
  excerpt: string,
): Record<string, unknown> {
  const banner = lang === 'ka' ? FAKE_BANNER_KA : FAKE_BANNER_EN;
  const labelByLang = lang === 'ka' ? 'ფეიკი' : 'FAKE';
  return {
    id: `${sectionKey}_${idx}`,
    label: `🟧 ${labelByLang} #${idx + 1}`,
    title: `⚠️ FAKE — ${sectionKey} card ${idx + 1}`,
    body: [
      banner,
      excerpt || `[${labelByLang}] ${sectionKey} placeholder body ${idx + 1}.`,
    ],
    crossReferences: [],
    expandedContent: null,
    hint: null,
    accentElement: ELEMENTS[idx % ELEMENTS.length],
  };
}

export function buildFakeNatalReading(
  analysis: string,
  lang: 'ka' | 'en',
): Record<string, unknown> {
  const reading: Record<string, unknown> = { _fake: true };
  const banner = lang === 'ka' ? FAKE_BANNER_KA : FAKE_BANNER_EN;

  for (const key of SECTION_KEYS) {
    const sectionKey = key as SectionKey;
    const meta = SECTION_META[sectionKey][lang];
    const count = SECTION_CARD_COUNTS[sectionKey];
    const excerpts = chunkAnalysis(analysis, count);
    const cards = excerpts.map((text, i) => buildFakeCard(sectionKey, i, lang, text));

    if (sectionKey === 'overview') {
      reading[key] = {
        sectionTitle: `⚠️ FAKE — ${meta.title}`,
        sectionTagline: `${meta.tagline} · ${banner}`,
        // planetTable / aspects / points injected by route from chart_data.
        coreCards: cards,
        pullQuote: banner,
      };
    } else {
      reading[key] = {
        sectionTitle: `⚠️ FAKE — ${meta.title}`,
        sectionTagline: `${meta.tagline} · ${banner}`,
        cards,
        pullQuote: banner,
      };
    }
  }

  return reading;
}
