// ============================================================
// Sample synastry reading — simulates the JSON the AI pipeline
// emits, so the redesigned SynastryView can be previewed without
// hitting Supabase / the model. Couple variant, Nino + Giorgi.
//
// NOTE: meta.compatibilityScore is intentionally 87 while the six
// category scores derive to 80 — this demonstrates that the UI now
// computes the headline from the categories (code owns the number)
// rather than trusting the model's standalone field.
// ============================================================

import type { SynastryReadingData, ChartPersonData } from '@/components/synastry/SynastryView';

const card = (
  id: string,
  label: string,
  title: string,
  body: string[],
  a: string,
  b: string,
  extra?: Partial<{
    crossReferences: string[];
    expandedContent: string[];
    hint: { title: string; content: string; bullets: string[] | null };
  }>,
) => ({
  id,
  label,
  title,
  body,
  aspectType: 'harmony' as const,
  accentElementA: a,
  accentElementB: b,
  crossReferences: extra?.crossReferences ?? [],
  expandedContent: extra?.expandedContent ?? null,
  hint: extra?.hint ?? null,
});

export const SAMPLE_READING: SynastryReadingData = {
  meta: {
    type: 'synastry_couple',
    language: 'en',
    personA: { name: 'Nino', sun: 'cancer', moon: 'pisces', asc: 'libra', gender: 'female' },
    personB: { name: 'Giorgi', sun: 'scorpio', moon: 'taurus', asc: 'leo', gender: 'male' },
    compatibilityScore: 87,
    categoryScores: {
      emotional: 88,
      intellectual: 72,
      passion: 79,
      karmic: 91,
      growth: 84,
      challenge: 54,
    },
    categoryCaptions: {
      emotional: 'Moon in Pisces meets Moon in Taurus — one feels, one steadies.',
      intellectual: 'Mercury square — you think in different tongues, and translate slowly.',
      passion: 'Venus–Mars pull is strong; the tempo of desire differs.',
      karmic: 'Your nodal axes lock almost to the degree — this reads as fated.',
      growth: 'Jupiter trine builds something practical beyond romance.',
      challenge: 'Most friction gathers around control and pace.',
    },
  },
  emotionalBond: {
    sectionTitle: 'Emotional Bond',
    sectionSubtitle: 'Where you feel each other — Moon to Moon',
    cards: [
      card(
        'eb-1',
        'Moon · Moon',
        'One feels, the other steadies',
        [
          "Nino's Pisces Moon runs on tides — feeling arrives before language. Giorgi's Taurus Moon runs on ground — it wants the feeling made solid before it moves.",
          'The gift is complementarity: she teaches him to name the undertow, he teaches her that a feeling can be held without drowning in it.',
        ],
        'water',
        'earth',
        {
          expandedContent: [
            'When Nino spirals, Giorgi should not fix — he should sit. Presence, not solutions.',
            'When Giorgi goes silent, Nino should read it as processing, not withdrawal.',
          ],
          hint: {
            title: 'Try this',
            content: 'Name the weather before the problem. "I feel foggy" lands better than "we need to talk".',
            bullets: null,
          },
        },
      ),
    ],
    pullQuote: 'She is the tide; he is the shore. Neither works alone.',
  },
  passion: {
    sectionTitle: 'Passion & Attraction',
    sectionSubtitle: 'Venus, Mars, and the tempo of desire',
    cards: [
      card(
        'pa-1',
        'Venus · Mars',
        'Different tempos, real pull',
        [
          "Giorgi's Scorpio intensity meets Nino's Libra need for beauty and pace. The magnetism is not in question — the rhythm is.",
        ],
        'fire',
        'air',
      ),
    ],
    pullQuote: 'Desire is easy. Timing is the practice.',
  },
  karmic: {
    sectionTitle: 'Karmic Connection',
    sectionSubtitle: 'The nodal axis, and what feels fated',
    cards: [
      card(
        'ka-1',
        'North Node · South Node',
        'The lesson each carries for the other',
        [
          "Your nodal axes lock almost to the degree. Giorgi sits on Nino's North Node — he embodies the exact direction her soul is reaching for.",
          'This is why it feels fated rather than chosen: you are each other\'s assignment and reward.',
        ],
        'gold',
        'gold',
      ),
    ],
    pullQuote: 'Not chosen. Recognised.',
  },
  numerology: {
    sectionTitle: 'Numerology',
    sectionSubtitle: 'Two Life Paths, side by side',
    cards: [
      card(
        'nu-1',
        'Life Path 4 · 9',
        'The builder and the completer',
        [
          'Nino walks a Life Path 4 — the builder. Giorgi walks a 9 — the completer. Together the foundation actually gets finished.',
        ],
        'air',
        'air',
      ),
    ],
    pullQuote: 'One lays the stone; the other knows when the wall is done.',
  },
  growth: {
    sectionTitle: 'Growth Potential',
    sectionSubtitle: 'Where you expand and heal each other',
    cards: [
      card(
        'gr-1',
        'Jupiter trine',
        'You build, not just bond',
        [
          "Jupiter's trine points beyond romance: a shared project, a home, a practice. This pairing is happiest when it is making something.",
        ],
        'earth',
        'earth',
      ),
    ],
    pullQuote: 'Love here is a verb with a to-do list.',
  },
  sharedShadow: {
    sectionTitle: 'Shared Shadow',
    sectionSubtitle: 'The trigger loop, and the way out',
    cards: [
      card(
        'ss-1',
        'Saturn · Mars',
        'Control meets pace',
        [
          'The loop: Giorgi tightens control when anxious; Nino reads control as rejection and pulls away; the distance makes Giorgi tighten further.',
          'The exit is naming the loop out loud, early — before it has momentum.',
        ],
        'shadow',
        'fire',
        {
          hint: {
            title: 'De-escalation',
            content: 'A shared codeword for "we are in the loop again" beats any argument about who started it.',
            bullets: null,
          },
        },
      ),
    ],
    pullQuote: 'The loop is not the enemy. Not naming it is.',
  },
  dailyRitual: {
    sectionTitle: 'Daily Ritual',
    sectionSubtitle: 'Practices tuned to your rhythms',
    cards: [
      card(
        'dr-1',
        'Lunar rhythm',
        'A weekly tide-check',
        [
          'Once a week, at the same hour, each says one thing they felt and one thing they built. Feeling and foundation, in the same breath.',
        ],
        'water',
        'earth',
      ),
    ],
    pullQuote: 'Small rituals hold what big talks cannot.',
  },
  potential: {
    sectionTitle: 'Maximum Potential',
    sectionSubtitle: 'This bond at its most conscious',
    cards: [
      card(
        'po-1',
        'Integrated vision',
        'Tide and shore, building together',
        [
          'At its highest, this is a partnership where feeling is honoured and ground is kept — a home that is both safe and alive, made by two people who stopped fearing each other\'s nature.',
        ],
        'gold',
        'water',
      ),
    ],
    pullQuote: 'The tide stopped fighting the shore. They started making a coastline.',
  },
};

export const SAMPLE_CHART_A: ChartPersonData = {
  planets: [
    { name: 'Sun', sign: 'Cancer', degree: '12°', house: '10', retrograde: false },
    { name: 'Moon', sign: 'Pisces', degree: '27°', house: '6', retrograde: false },
    { name: 'Venus', sign: 'Gemini', degree: '19°', house: '9', retrograde: false },
    { name: 'Mars', sign: 'Leo', degree: '08°', house: '11', retrograde: false },
  ],
  points: { ascendant: { sign: 'Libra', degree: '04°' } },
};

export const SAMPLE_CHART_B: ChartPersonData = {
  planets: [
    { name: 'Sun', sign: 'Scorpio', degree: '03°', house: '4', retrograde: false },
    { name: 'Moon', sign: 'Taurus', degree: '21°', house: '10', retrograde: false },
    { name: 'Venus', sign: 'Libra', degree: '26°', house: '3', retrograde: false },
    { name: 'Mars', sign: 'Capricorn', degree: '11°', house: '6', retrograde: true },
  ],
  points: { ascendant: { sign: 'Leo', degree: '15°' } },
};
