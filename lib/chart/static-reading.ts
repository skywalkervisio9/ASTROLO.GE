// ============================================================
// buildStaticReading — free/invited tier reading from chart_data only.
// Returns a full reading shape with real planet positions in overview
// and locked placeholder cards for all other sections.
// Shared between /api/reading/natal and /api/reading/public.
// ============================================================

import { SECTION_KEYS, type SectionKey } from '@/types/reading';
import { LOCKED_CARD_TITLES } from '@/lib/utils/lockedSectionLabels';

const SECTION_META: Record<SectionKey, { ka: { title: string; tagline: string }; en: { title: string; tagline: string } }> = {
  overview:        { ka: { title: 'პლანეტური მონახაზი',    tagline: '' },                              en: { title: 'Planetary Overview',    tagline: '' } },
  mission:         { ka: { title: 'სულის მიმართულება',     tagline: 'თქვენი სიცოცხლის მიზანი' },       en: { title: "Your Soul's Direction", tagline: 'Your Life Purpose' } },
  characteristics: { ka: { title: 'ძირეული ბუნება',        tagline: 'თქვენი შინაგანი სამყარო' },        en: { title: 'Your Core Nature',      tagline: 'Your Inner World' } },
  relationships:   { ka: { title: 'გულის ხელნაწერი',       tagline: 'თქვენი პარტნიორობის სტილი' },      en: { title: "Your Heart's Blueprint", tagline: 'Your Partnership Style' } },
  work:            { ka: { title: 'კარიერის გზა',           tagline: 'თქვენი პროფესიული ნიჭი' },         en: { title: 'Your Career Path',      tagline: 'Your Professional Gift' } },
  shadow:          { ka: { title: 'ფარული სიძლიერე',       tagline: 'თქვენი ზრდის კიდე' },             en: { title: 'Your Hidden Strength',  tagline: 'Your Growth Edge' } },
  spiritual:       { ka: { title: 'სულის საჩუქარი',         tagline: 'თქვენი სულიერი გზა' },            en: { title: "Your Soul's Gift",      tagline: 'Your Spiritual Path' } },
  potential:       { ka: { title: 'უმაღლესი გამოხატულება', tagline: 'თქვენი ბედის ნიმუში' },            en: { title: 'Your Highest Expression', tagline: 'Your Destiny Pattern' } },
};

export function buildStaticReading(
  lang: 'ka' | 'en',
  chartData: { planets?: unknown; aspects?: unknown; points?: unknown } | null,
): Record<string, unknown> {
  const reading: Record<string, unknown> = {};

  for (const key of SECTION_KEYS) {
    const sectionKey = key as SectionKey;
    const meta = SECTION_META[sectionKey][lang];

    if (sectionKey === 'overview') {
      reading[key] = {
        sectionTitle: meta.title,
        sectionTagline: meta.tagline,
        planetTable: chartData?.planets ?? [],
        aspects: chartData?.aspects ?? [],
        points: chartData?.points ?? {},
        coreCards: [],
      };
    } else {
      const labels = LOCKED_CARD_TITLES[sectionKey][lang];
      reading[key] = {
        sectionTitle: meta.title,
        sectionTagline: meta.tagline,
        cards: labels.map((title, i) => ({ id: `${key}_${i}`, label: '', title, body: [] })),
        pullQuote: null,
      };
    }
  }

  return reading;
}
