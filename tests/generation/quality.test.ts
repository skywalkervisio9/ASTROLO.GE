import test from 'node:test';
import assert from 'node:assert/strict';
import { assessNatalReadingQuality, MIN_TOTAL_CARDS } from '@/lib/AIgeneration/validator';
import { SECTION_KEYS } from '@/types/reading';

// Realistic-length card body (~200 words) so that healthy fixtures clear the
// word-estimate floor and the tests exercise the card-count + thin-section
// logic rather than tripping the word floor by accident.
const PARAGRAPH = Array.from({ length: 10 }, () =>
  'This is a representative sentence of natal reading prose describing a placement in depth.'
).join(' ');

function card(i: number) {
  return {
    id: `c${i}`,
    label: 'Label',
    title: 'Title',
    body: [PARAGRAPH, PARAGRAPH],
    crossReferences: [],
    expandedContent: null,
    hint: null,
    accentElement: 'fire',
  };
}

function section(n: number) {
  return {
    sectionTitle: 'T',
    sectionTagline: 'Tag',
    cards: Array.from({ length: n }, (_, i) => card(i)),
    pullQuote: null,
  };
}

// Build a reading where each section gets `counts[key]` cards. Overview uses
// coreCards; the rest use cards.
function reading(counts: Record<string, number>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const key of SECTION_KEYS) {
    const n = counts[key] ?? 0;
    if (key === 'overview') {
      r[key] = { sectionTitle: 'T', sectionTagline: 'Tag', coreCards: Array.from({ length: n }, (_, i) => card(i)), pullQuote: null };
    } else {
      r[key] = section(n);
    }
  }
  return r;
}

const HEALTHY = { overview: 3, mission: 4, characteristics: 4, relationships: 4, work: 4, shadow: 4, spiritual: 4, potential: 2 }; // 29
const BOGPREMIUM = { overview: 2, mission: 1, characteristics: 2, relationships: 2, work: 2, shadow: 2, spiritual: 2, potential: 2 }; // 15

test('healthy reading passes the quality floor', () => {
  const q = assessNatalReadingQuality(reading(HEALTHY));
  assert.equal(q.totalCards, 29);
  assert.equal(q.tooThin, false);
  assert.deepEqual(q.thinSections, []);
});

test('bogpremium-shaped reading is flagged too thin', () => {
  const q = assessNatalReadingQuality(reading(BOGPREMIUM));
  assert.equal(q.totalCards, 15);
  assert.ok(q.totalCards < MIN_TOTAL_CARDS);
  assert.equal(q.tooThin, true);
  // every section except potential (min 2, has 2) is below its min
  assert.ok(q.thinSections.includes('mission'));
  assert.ok(q.thinSections.includes('overview'));
  assert.ok(!q.thinSections.includes('potential'));
});

test('thinSections lists only sections below their per-section minimum', () => {
  // 18 cards total (== floor) but mission is short by one
  const counts = { overview: 3, mission: 3, characteristics: 4, relationships: 4, work: 4, shadow: 4, spiritual: 4, potential: 2 };
  const q = assessNatalReadingQuality(reading(counts));
  assert.deepEqual(q.thinSections, ['mission']);
});
