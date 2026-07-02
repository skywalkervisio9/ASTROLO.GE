// Birth-place geocoding for the DOB-correction modal.
// Mirrors the autocomplete in public/app-runtime.js (Nominatim search +
// timeapi.io timezone resolution) but as reusable TS for React call-sites.

import { KA_COUNTRIES, getCitySeed, type CitySeed } from './cities';

export interface PlaceResult {
  /** Display label, e.g. "Tbilisi, Georgia" / "თბილისი, საქართველო" */
  label: string;
  lat: number;
  lng: number;
  /** ISO country code (lowercase) when known — used to fast-path tz for Georgia. */
  cc: string;
  /** true for local-seed entries (instant, no network). */
  seed: boolean;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  importance?: number | string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
}

const SUBDIVISION_TYPES = new Set([
  'suburb', 'quarter', 'neighbourhood', 'city_district', 'borough', 'district',
]);

/** Apply the same filtering/dedup as the runtime, then normalize to PlaceResult[]. */
function normalizeNominatim(
  raw: NominatimResult[],
  lang: 'ka' | 'en',
  seedEnLabels: Set<string>,
): PlaceResult[] {
  let results = raw
    .filter((r) => r.class === 'place' || r.class === 'boundary')
    .filter((r) => !SUBDIVISION_TYPES.has(r.type || '') && !SUBDIVISION_TYPES.has(r.addresstype || ''))
    .filter((r) => parseFloat(String(r.importance ?? 0)) > 0.25)
    .sort((a, b) => parseFloat(String(b.importance ?? 0)) - parseFloat(String(a.importance ?? 0)))
    .filter((r) => {
      const en = (r.namedetails && r.namedetails['name:en']) || r.name || '';
      return !seedEnLabels.has(en.toLowerCase());
    });

  const seenCoords = new Set<string>();
  const seenLabels = new Set<string>();
  results = results.filter((r) => {
    const coordKey = parseFloat(r.lat).toFixed(1) + ',' + parseFloat(r.lon).toFixed(1);
    const addr = r.address || {};
    const names = r.namedetails || {};
    const city = names['name:en'] || r.name || '';
    const labelKey = city.toLowerCase() + '|' + (addr.country_code || '');
    if (seenCoords.has(coordKey) || seenLabels.has(labelKey)) return false;
    seenCoords.add(coordKey);
    seenLabels.add(labelKey);
    return true;
  }).filter((r) => {
    // Drop entries where the city name equals the country name.
    const names = r.namedetails || {};
    const cityEn = names['name:en'] || r.name || '';
    const countryEn = (r.address || {}).country || '';
    return cityEn.toLowerCase() !== countryEn.toLowerCase();
  });

  return results.map((r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const addr = r.address || {};
    const names = r.namedetails || {};
    const cityEn = names['name:en'] || addr.city || addr.town || addr.village || addr.municipality || addr.county || r.name || (r.display_name || '').split(',')[0];
    const cityKa = names['name:ka'] || r.name || addr.city || addr.town || addr.village || addr.municipality || addr.county || cityEn;
    const cc = (addr.country_code || '').toLowerCase();
    const countryEn = addr.country || '';
    const countryKa = KA_COUNTRIES[cc] || countryEn;
    const cityLabel = lang === 'ka' ? cityKa : cityEn;
    const countryLabel = lang === 'ka' ? countryKa : countryEn;
    const label = cityLabel + (countryLabel ? ', ' + countryLabel : '');
    return { label, lat, lng, cc, seed: false };
  });
}

function seedToResult(s: CitySeed): PlaceResult {
  return { label: `${s.label}, ${s.country}`, lat: s.lat, lng: s.lng, cc: s.cc, seed: true };
}

/** Instant local-seed matches (no network) so the dropdown can render immediately. */
export function localSeed(q: string, lang: 'ka' | 'en'): PlaceResult[] {
  if (q.trim().length < 2) return [];
  return getCitySeed(q.trim(), lang).map(seedToResult);
}

/**
 * Combined city search: instant local seed + Nominatim global results.
 * Seed entries are returned first. Network failures degrade to seed-only.
 */
export async function searchCities(q: string, lang: 'ka' | 'en'): Promise<PlaceResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const seeds = getCitySeed(query, lang);
  const seedResults = seeds.map(seedToResult);
  const seedEnLabels = new Set(seeds.map((s) => s.en.toLowerCase()));

  try {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query)
      + '&format=json&limit=10&addressdetails=1&namedetails=1&featuretype=settlement';
    // Bound the network wait so a slow/blocked geocoder degrades to seed-only.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { headers: { 'Accept-Language': lang + ',en;q=0.8' }, signal: ctrl.signal });
    clearTimeout(timer);
    const data = (await res.json()) as NominatimResult[];
    return [...seedResults, ...normalizeNominatim(data, lang, seedEnLabels)];
  } catch {
    return seedResults;
  }
}

/**
 * Resolve an IANA timezone for coordinates. Georgia short-circuits to
 * Asia/Tbilisi (matches the runtime). Falls back to Asia/Tbilisi on failure
 * so the chart pipeline always has a valid tz.
 */
export async function resolveTimezone(lat: number, lng: number, cc?: string): Promise<string> {
  if (cc === 'ge') return 'Asia/Tbilisi';
  try {
    const res = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`);
    const tz = (await res.json()) as { timeZone?: string };
    return tz?.timeZone || 'Asia/Tbilisi';
  } catch {
    return 'Asia/Tbilisi';
  }
}
