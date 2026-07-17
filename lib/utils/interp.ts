// Accessor for the shared popup copy in public/runtime-interp.json — the same
// dictionaries app-runtime.js reads through _withInterp (see its comment at
// :1299: that JSON is the source of truth).
//
// React needs its own accessor because the runtime is only loaded on the in-app
// shell (PrototypeClient / PublicReadingClient). /s/[slug] — the canonical
// public synastry URL — and /synastry-preview render SynastryView with no
// runtime at all, so the runtime's delegated popup handlers don't exist there.
//
// Caching mirrors _loadInterp: module-level, one fetch, failures clear the
// promise so the next call retries. The ?v= rule matches lib/runtime-src.ts —
// hashed+immutable in prod builds, raw must-revalidate in dev.

const V = process.env.NEXT_PUBLIC_RUNTIME_V || '';

export const INTERP_SRC = V ? `/runtime-interp.min.json?v=${V}` : '/runtime-interp.json';

/** A popup entry: `t` = title, `b` = body. */
export interface InterpEntry {
  t: string;
  b: string;
}

/** Chart-point entries additionally carry the acronym rendered before the title. */
export interface InterpPoint extends InterpEntry {
  acr: string;
}

// Only the dictionaries React reads are typed; the JSON also holds elData,
// aspectData, _aspTypeBody and _HOUSE_DATA for the runtime's own popups.
export interface InterpData {
  /** Keyed by planet, lowercase — 'sun', 'moon', 'venus', 'mars', … */
  plData: Record<string, Record<string, InterpEntry>>;
  /** Keyed by chart point — 'asc', 'dsc', 'mc', 'ic'. */
  cpData: Record<string, Record<string, InterpPoint>>;
  /** Indexed Aries..Pisces (0-11). */
  _SIGN_DATA: Record<string, InterpEntry[]>;
}

let cache: InterpData | null = null;
let inflight: Promise<InterpData> | null = null;

export function loadInterp(): Promise<InterpData> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch(INTERP_SRC)
      .then((r) => {
        if (!r.ok) throw new Error('interp HTTP ' + r.status);
        return r.json();
      })
      .then((d: InterpData) => {
        cache = d;
        return d;
      })
      .catch((e) => {
        inflight = null; // next call retries
        throw e;
      });
  }
  return inflight;
}

// ── Sign helpers, mirroring _SIGN_IDS / _SIGN_IDX / _SIGN_EL_COLOR in
//    public/app-runtime.js:1686-1689 — keep in sync.

export const SIGN_GLYPH_IDS = [
  'gl-aries', 'gl-taurus', 'gl-gemini', 'gl-cancer', 'gl-leo', 'gl-virgo',
  'gl-libra', 'gl-scorpio', 'gl-sagittarius', 'gl-capricorn', 'gl-aquarius', 'gl-pisces',
];

const SIGN_IDX: Record<string, number> = {
  aries: 0, taurus: 1, gemini: 2, cancer: 3, leo: 4, virgo: 5,
  libra: 6, scorpio: 7, sagittarius: 8, capricorn: 9, aquarius: 10, pisces: 11,
};

/** Element cycle: fire, earth, air, water repeated × 3. */
export const SIGN_EL_COLOR = [
  '#d4644a', '#6b9a6b', '#6b8fb5', '#7b6baa', '#d4644a', '#6b9a6b',
  '#6b8fb5', '#7b6baa', '#d4644a', '#6b9a6b', '#6b8fb5', '#7b6baa',
];

/** `.sign-pop` element suffix, indexed like SIGN_EL_COLOR. */
export const SIGN_EL_CLASS = ['sf', 'se', 'sa', 'sw'];

/** English sign name → 0-11 index, or -1. Tolerates the loose matching the
 *  runtime does at :3178-3183 (the model occasionally emits decorated names). */
export function signIndex(sign?: string): number {
  const lower = (sign || '').trim().toLowerCase();
  if (!lower) return -1;
  if (lower in SIGN_IDX) return SIGN_IDX[lower];
  for (const [k, v] of Object.entries(SIGN_IDX)) {
    if (lower.includes(k) || k.includes(lower)) return v;
  }
  return -1;
}
