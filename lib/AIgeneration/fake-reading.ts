// ============================================================
// markReadingAsFakeCopy — dev-only. Clones a real previous reading
// and stamps a "🔁 FAKE COPY" hint at the start of every section
// so a test user can see the real layout/content shape without
// spending Call 2 tokens or waiting 5 min.
//
// The route copies reading_ka / reading_en from another user's
// completed natal_readings row, runs this through both, and saves.
// Chart-data overview is re-injected by the route so the planet
// table + aspects still match the current user.
// ============================================================

import { SECTION_KEYS } from '@/types/reading';

const FAKE_HINT_KA = '🔁 ფეიკი ასლი — სხვა მომხმარებლის ნამდვილი წაკითხვიდან.';
const FAKE_HINT_EN = '🔁 FAKE COPY — cloned from another user\'s real reading.';
const FAKE_HINT_PREFIX = '🔁 FAKE';

function fakeHint(lang: 'ka' | 'en'): string {
  return lang === 'ka' ? FAKE_HINT_KA : FAKE_HINT_EN;
}

function stamp(value: unknown, prefix: string): string {
  const s = typeof value === 'string' ? value : '';
  if (s.startsWith(prefix)) return s;
  return s ? `${prefix} · ${s}` : prefix;
}

function stampCards(cards: unknown, lang: 'ka' | 'en'): unknown {
  if (!Array.isArray(cards)) return cards;
  const hint = fakeHint(lang);
  return cards.map((card) => {
    if (!card || typeof card !== 'object') return card;
    const c = card as Record<string, unknown>;
    const body = Array.isArray(c.body) ? c.body : [];
    return {
      ...c,
      title: stamp(c.title, FAKE_HINT_PREFIX),
      body: body.length > 0 && body[0] === hint ? body : [hint, ...body],
    };
  });
}

export function markReadingAsFakeCopy(
  source: Record<string, unknown> | null | undefined,
  lang: 'ka' | 'en',
): Record<string, unknown> | null {
  if (!source || typeof source !== 'object') return null;

  const hint = fakeHint(lang);
  const out: Record<string, unknown> = { ...source, _fake: true };

  for (const key of SECTION_KEYS) {
    const section = out[key];
    if (!section || typeof section !== 'object') continue;
    const s = section as Record<string, unknown>;
    out[key] = {
      ...s,
      sectionTitle: stamp(s.sectionTitle, FAKE_HINT_PREFIX),
      sectionTagline: stamp(s.sectionTagline, hint),
      ...(s.cards !== undefined ? { cards: stampCards(s.cards, lang) } : {}),
      ...(s.coreCards !== undefined ? { coreCards: stampCards(s.coreCards, lang) } : {}),
    };
  }

  return out;
}
