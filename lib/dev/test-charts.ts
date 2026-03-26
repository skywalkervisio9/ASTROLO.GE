// ============================================================
// Test chart data for dev seeding
// Luka's chart = existing prototype positions
// Nino's chart = designed for compelling couple synastry
// ============================================================

// Fixed UUIDs for idempotent seeding
export const TEST_USERS = {
  luka: {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    email: 'luka.test@astrolo.ge',
    password: 'testpass123!',
    full_name: 'ლუკა.პ',
    birth_day: 15,
    birth_month: 10,
    birth_year: 1995,
    birth_hour: 14,
    birth_minute: 30,
    birth_city: 'თბილისი',
    birth_lat: 41.7151,
    birth_lng: 44.8271,
    birth_timezone: 'Asia/Tbilisi',
    gender: 'male',
    account_type: 'premium' as const,
    language: 'ka' as const,
  },
  nino: {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    email: 'nino.test@astrolo.ge',
    password: 'testpass123!',
    full_name: 'ნინო.მ',
    birth_day: 8,
    birth_month: 4,
    birth_year: 1997,
    birth_hour: 6,
    birth_minute: 15,
    birth_city: 'ბათუმი',
    birth_lat: 41.6168,
    birth_lng: 41.6367,
    birth_timezone: 'Asia/Tbilisi',
    gender: 'female',
    account_type: 'invited' as const,
    language: 'ka' as const,
  },
};

// ── Luka's chart context (plain English, mimics Astrologer API output) ──

export const LUKA_CHART_CONTEXT = `
NATAL CHART ANALYSIS
Name: Luka P.
Date of Birth: October 15, 1995
Time of Birth: 14:30
Place of Birth: Tbilisi, Georgia (41°43'N, 44°49'E)
Timezone: Asia/Tbilisi (UTC+4)

═══════════════════════════════════════
PLANETARY POSITIONS
═══════════════════════════════════════

Sun: Libra 22°20' (House III)
Moon: Virgo 2°40' (House II)
Mercury: Scorpio 5°55' (House IV)
Venus: Libra 18°40' (House III)
Mars: Virgo 5°07' (House II)
Jupiter: Pisces 19°32' Retrograde (House VIII)
Saturn: Taurus 0°47' Retrograde (House X)
Uranus: Aquarius 8°49' Retrograde (House VII)
Neptune: Capricorn 29°24' (House VI)
Pluto: Sagittarius 6°18' (House V)

═══════════════════════════════════════
ANGULAR POINTS
═══════════════════════════════════════

Ascendant (ASC): Leo 17°20'
Midheaven (MC): Taurus 7°39'
Descendant (DC): Aquarius 17°20'
Imum Coeli (IC): Scorpio 7°39'

═══════════════════════════════════════
LUNAR NODES & SPECIAL POINTS
═══════════════════════════════════════

North Node: Leo 29°54' (House I) — anaretic degree, critical
South Node: Aquarius 29°54' (House VII)
Black Moon Lilith: Scorpio 4°03' (House IV)
Part of Fortune: Gemini 27°40' (House XI)

═══════════════════════════════════════
HOUSE CUSPS (Placidus)
═══════════════════════════════════════

House I: Leo 17°20'
House II: Virgo 10°15'
House III: Libra 8°30'
House IV: Scorpio 7°39'
House V: Sagittarius 10°45'
House VI: Capricorn 14°20'
House VII: Aquarius 17°20'
House VIII: Pisces 10°15'
House IX: Aries 8°30'
House X: Taurus 7°39'
House XI: Gemini 10°45'
House XII: Cancer 14°20'

═══════════════════════════════════════
MAJOR ASPECTS
═══════════════════════════════════════

Sun conjunct Venus — Libra 22°20' / Libra 18°40' (orb 3°40') — HARMONY
Moon conjunct Mars — Virgo 2°40' / Virgo 5°07' (orb 2°27') — MAGNETIC
Mercury conjunct Lilith — Scorpio 5°55' / Scorpio 4°03' (orb 1°52') — MAGNETIC
Sun trine North Node — Libra 22°20' / Leo 29°54' (orb 7°34') — HARMONY
Venus trine North Node — Libra 18°40' / Leo 29°54' (orb 4°46') — HARMONY
Jupiter opposition Moon — Pisces 19°32' / Virgo 2°40' (orb 3°08') — TENSION (applying)
Jupiter opposition Mars — Pisces 19°32' / Virgo 5°07' (orb 5°35') — TENSION
Mercury square Uranus — Scorpio 5°55' / Aquarius 8°49' (orb 2°54') — TENSION
Neptune trine Moon — Capricorn 29°24' / Virgo 2°40' (orb 3°16') — HARMONY
Neptune trine Mars — Capricorn 29°24' / Virgo 5°07' (orb 5°43') — HARMONY
Saturn sextile Jupiter — Taurus 0°47' / Pisces 19°32' (orb wide) — HARMONY
Pluto sextile Moon — Sagittarius 6°18' / Virgo 2°40' (orb 3°38') — HARMONY
Pluto square Mercury — Sagittarius 6°18' / Scorpio 5°55' (orb 0°23') — TENSION (tight!)
Sun opposition Jupiter — Libra 22°20' / Pisces 19°32' (orb wide, out-of-sign)

═══════════════════════════════════════
ELEMENT & MODALITY DISTRIBUTION
═══════════════════════════════════════

Fire: 2 (Pluto in Sag, North Node in Leo)
Earth: 4 (Moon, Mars in Virgo; Saturn in Taurus; Neptune in Cap)
Air: 3 (Sun, Venus in Libra; Uranus in Aquarius)
Water: 2 (Mercury in Scorpio; Jupiter in Pisces)

Cardinal: 3 (Sun, Venus in Libra; Neptune in Cap)
Fixed: 3 (Saturn in Taurus; Uranus in Aquarius; North Node in Leo)
Mutable: 4 (Moon, Mars in Virgo; Jupiter in Pisces; Pluto in Sag)

Dominant element: Earth (practical, grounded)
Dominant modality: Mutable (adaptable, flexible)

═══════════════════════════════════════
RETROGRADE PLANETS
═══════════════════════════════════════

Jupiter Retrograde in Pisces (House VIII): Internalized spiritual expansion, deep inner faith. Wealth comes through transformation and inheritance of wisdom rather than external accumulation.

Saturn Retrograde in Taurus (House X): Career authority earned slowly, internalized discipline. Father figure themes. Public image built on inner substance rather than performance.

Uranus Retrograde in Aquarius (House VII): Unconventional approach to partnerships internalized. Attracts unusual relationships. Freedom needs processed internally before expressed.

═══════════════════════════════════════
DIGNITIES & DEBILITIES
═══════════════════════════════════════

Venus in Libra — DOMICILE (strong, natural expression)
Uranus in Aquarius — DOMICILE (strong, natural expression)
Jupiter in Pisces — DOMICILE (strong, natural expression)
Moon in Virgo — PEREGRINE (functional but not empowered)
Saturn in Taurus — PEREGRINE

═══════════════════════════════════════
NOTABLE CONFIGURATIONS
═══════════════════════════════════════

- Moon-Mars conjunction in Virgo (House II): Emotional energy channeled through service, perfectionism, and material security. Can be hypercritical under stress.
- Mercury-Lilith conjunction in Scorpio (House IV): Deep, taboo communication style. Family secrets. Psychological depth in speech and thought. Research ability.
- Sun-Venus conjunction in Libra (House III): Charming communicator, artistic expression through words, aesthetic sensibility in daily interactions.
- North Node at 29° Leo (anaretic): Urgent evolutionary push toward self-expression, creative leadership, and courage. South Node 29° Aquarius releases over-intellectualization and emotional detachment.
- Three planets retrograde: Inner processing emphasis. Wisdom develops through reflection rather than external action.
`.trim();

// ── Nino's chart context (made up for compelling couple synastry) ──

export const NINO_CHART_CONTEXT = `
NATAL CHART ANALYSIS
Name: Nino M.
Date of Birth: April 8, 1997
Time of Birth: 06:15
Place of Birth: Batumi, Georgia (41°37'N, 41°38'E)
Timezone: Asia/Tbilisi (UTC+4)

═══════════════════════════════════════
PLANETARY POSITIONS
═══════════════════════════════════════

Sun: Aries 18°45' (House X)
Moon: Pisces 21°10' (House IX)
Mercury: Aries 2°15' (House X)
Venus: Taurus 3°20' (House XI)
Mars: Leo 19°05' (House II)
Jupiter: Aquarius 8°12' (House VIII)
Saturn: Aries 15°44' (House X)
Uranus: Aquarius 5°30' (House VIII)
Neptune: Capricorn 28°52' (House VII)
Pluto: Sagittarius 5°48' (House VI)

═══════════════════════════════════════
ANGULAR POINTS
═══════════════════════════════════════

Ascendant (ASC): Cancer 5°30'
Midheaven (MC): Pisces 12°00'
Descendant (DC): Capricorn 5°30'
Imum Coeli (IC): Virgo 12°00'

═══════════════════════════════════════
LUNAR NODES & SPECIAL POINTS
═══════════════════════════════════════

North Node: Virgo 1°20' (House III)
South Node: Pisces 1°20' (House IX)
Black Moon Lilith: Leo 22°15' (House II)
Part of Fortune: Sagittarius 7°55' (House VI)

═══════════════════════════════════════
HOUSE CUSPS (Placidus)
═══════════════════════════════════════

House I: Cancer 5°30'
House II: Leo 0°15'
House III: Virgo 2°30'
House IV: Virgo 12°00'
House V: Libra 18°45'
House VI: Sagittarius 2°20'
House VII: Capricorn 5°30'
House VIII: Aquarius 0°15'
House IX: Pisces 2°30'
House X: Pisces 12°00'
House XI: Aries 18°45'
House XII: Taurus 2°20'

═══════════════════════════════════════
MAJOR ASPECTS
═══════════════════════════════════════

Sun conjunct Saturn — Aries 18°45' / Aries 15°44' (orb 3°01') — MAGNETIC
Sun square Mars — Aries 18°45' / Leo 19°05' (orb 0°20') — TENSION (very tight!)
Moon trine Neptune — Pisces 21°10' / Capricorn 28°52' (orb 7°42') — HARMONY
Moon sextile Venus — Pisces 21°10' / Taurus 3°20' (orb wide) — HARMONY
Venus trine Pluto — Taurus 3°20' / Sagittarius 5°48' (orb 2°28') — HARMONY
Mercury square Neptune — Aries 2°15' / Capricorn 28°52' (orb 3°23') — TENSION
Jupiter conjunct Uranus — Aquarius 8°12' / Aquarius 5°30' (orb 2°42') — MAGNETIC
Mars trine Sun — Leo 19°05' / Aries 18°45' (orb 0°20') — actually square (same above)
Saturn square Mars — Aries 15°44' / Leo 19°05' (orb 3°21') — TENSION
Neptune sextile Pluto — Capricorn 28°52' / Sagittarius 5°48' (orb wide) — HARMONY
Lilith conjunct Mars — Leo 22°15' / Leo 19°05' (orb 3°10') — MAGNETIC

═══════════════════════════════════════
ELEMENT & MODALITY DISTRIBUTION
═══════════════════════════════════════

Fire: 4 (Sun, Mercury, Saturn in Aries; Mars in Leo)
Earth: 1 (Venus in Taurus)
Air: 2 (Jupiter, Uranus in Aquarius)
Water: 3 (Moon in Pisces; Neptune in Capricorn; ASC in Cancer)

Cardinal: 5 (Sun, Mercury, Saturn in Aries; Neptune in Cap; ASC Cancer)
Fixed: 3 (Mars in Leo; Jupiter, Uranus in Aquarius)
Mutable: 2 (Moon in Pisces; Pluto in Sagittarius)

Dominant element: Fire (passionate, initiating)
Dominant modality: Cardinal (leadership, action)

═══════════════════════════════════════
RETROGRADE PLANETS
═══════════════════════════════════════

None. All planets direct — a chart of immediate external expression and action.

═══════════════════════════════════════
DIGNITIES & DEBILITIES
═══════════════════════════════════════

Venus in Taurus — DOMICILE (strong, natural sensuality and loyalty)
Mars in Leo — PEREGRINE but strong by house (commanding, dramatic energy)
Jupiter in Aquarius — DOMICILE (visionary, humanitarian impulses)
Saturn in Aries — FALL (authority struggles, learns leadership the hard way)
Moon in Pisces — strong by sign (deeply empathic, psychic sensitivity)

═══════════════════════════════════════
NOTABLE CONFIGURATIONS
═══════════════════════════════════════

- Sun-Saturn conjunction in Aries (House X): Born leader who earns authority through hard work and discipline. Father figure prominent. Ambition tempered by self-doubt, then transcended.
- Sun square Mars (0°20' orb — exact!): Explosive energy, competitive drive, physical vitality. Anger must find constructive outlet or becomes self-destructive.
- Jupiter-Uranus conjunction in Aquarius (House VIII): Revolutionary transformative energy. Sudden insights about shared resources, intimacy, and power. Tech-savvy, progressive values.
- Mars-Lilith conjunction in Leo (House II): Raw creative power tied to self-worth. Magnetic presence. Shadow around ego and validation through material/physical expression.
- Cancer Ascendant: Nurturing exterior, protective of inner world. Emotional intelligence as primary interface with world. Home and family as anchor.
- North Node in Virgo (House III): Evolutionary direction toward precision, service, practical communication. Releasing Pisces South Node escapism and victim patterns.
- All planets direct: No retrograde internalization — everything expressed outwardly, immediately. Learns through action, not reflection.
`.trim();

// ── Structured chart data for chart_data table ──

export const LUKA_CHART_DATA = {
  planets: [
    { name: 'Sun', sign: 'Libra', degree: '22°20\'', house: 'III', element: 'Air', retrograde: false },
    { name: 'Moon', sign: 'Virgo', degree: '2°40\'', house: 'II', element: 'Earth', retrograde: false },
    { name: 'Mercury', sign: 'Scorpio', degree: '5°55\'', house: 'IV', element: 'Water', retrograde: false },
    { name: 'Venus', sign: 'Libra', degree: '18°40\'', house: 'III', element: 'Air', retrograde: false },
    { name: 'Mars', sign: 'Virgo', degree: '5°07\'', house: 'II', element: 'Earth', retrograde: false },
    { name: 'Jupiter', sign: 'Pisces', degree: '19°32\'', house: 'VIII', element: 'Water', retrograde: true },
    { name: 'Saturn', sign: 'Taurus', degree: '0°47\'', house: 'X', element: 'Earth', retrograde: true },
    { name: 'Uranus', sign: 'Aquarius', degree: '8°49\'', house: 'VII', element: 'Air', retrograde: true },
    { name: 'Neptune', sign: 'Capricorn', degree: '29°24\'', house: 'VI', element: 'Earth', retrograde: false },
    { name: 'Pluto', sign: 'Sagittarius', degree: '6°18\'', house: 'V', element: 'Fire', retrograde: false },
  ],
  houses: [
    { number: 1, sign: 'Leo', degree: 17.33 },
    { number: 2, sign: 'Virgo', degree: 10.25 },
    { number: 3, sign: 'Libra', degree: 8.5 },
    { number: 4, sign: 'Scorpio', degree: 7.65 },
    { number: 5, sign: 'Sagittarius', degree: 10.75 },
    { number: 6, sign: 'Capricorn', degree: 14.33 },
    { number: 7, sign: 'Aquarius', degree: 17.33 },
    { number: 8, sign: 'Pisces', degree: 10.25 },
    { number: 9, sign: 'Aries', degree: 8.5 },
    { number: 10, sign: 'Taurus', degree: 7.65 },
    { number: 11, sign: 'Gemini', degree: 10.75 },
    { number: 12, sign: 'Cancer', degree: 14.33 },
  ],
  aspects: [
    { planet1: 'Sun', planet2: 'Venus', aspect: 'conjunction', orb: 3.67 },
    { planet1: 'Moon', planet2: 'Mars', aspect: 'conjunction', orb: 2.45 },
    { planet1: 'Mercury', planet2: 'Lilith', aspect: 'conjunction', orb: 1.87 },
    { planet1: 'Jupiter', planet2: 'Moon', aspect: 'opposition', orb: 3.13 },
    { planet1: 'Jupiter', planet2: 'Mars', aspect: 'opposition', orb: 5.58 },
    { planet1: 'Mercury', planet2: 'Uranus', aspect: 'square', orb: 2.9 },
    { planet1: 'Neptune', planet2: 'Moon', aspect: 'trine', orb: 3.27 },
    { planet1: 'Neptune', planet2: 'Mars', aspect: 'trine', orb: 5.72 },
    { planet1: 'Pluto', planet2: 'Mercury', aspect: 'square', orb: 0.38 },
    { planet1: 'Pluto', planet2: 'Moon', aspect: 'sextile', orb: 3.63 },
  ],
  points: {
    northNode: { sign: 'Leo', degree: '29°54\'' },
    southNode: { sign: 'Aquarius', degree: '29°54\'' },
    lilith: { sign: 'Scorpio', degree: '4°03\'' },
    partOfFortune: { sign: 'Gemini', degree: '27°40\'' },
    ascendant: { sign: 'Leo', degree: '17°20\'' },
    midheaven: { sign: 'Taurus', degree: '7°39\'' },
  },
};

export const NINO_CHART_DATA = {
  planets: [
    { name: 'Sun', sign: 'Aries', degree: '18°45\'', house: 'X', element: 'Fire', retrograde: false },
    { name: 'Moon', sign: 'Pisces', degree: '21°10\'', house: 'IX', element: 'Water', retrograde: false },
    { name: 'Mercury', sign: 'Aries', degree: '2°15\'', house: 'X', element: 'Fire', retrograde: false },
    { name: 'Venus', sign: 'Taurus', degree: '3°20\'', house: 'XI', element: 'Earth', retrograde: false },
    { name: 'Mars', sign: 'Leo', degree: '19°05\'', house: 'II', element: 'Fire', retrograde: false },
    { name: 'Jupiter', sign: 'Aquarius', degree: '8°12\'', house: 'VIII', element: 'Air', retrograde: false },
    { name: 'Saturn', sign: 'Aries', degree: '15°44\'', house: 'X', element: 'Fire', retrograde: false },
    { name: 'Uranus', sign: 'Aquarius', degree: '5°30\'', house: 'VIII', element: 'Air', retrograde: false },
    { name: 'Neptune', sign: 'Capricorn', degree: '28°52\'', house: 'VII', element: 'Earth', retrograde: false },
    { name: 'Pluto', sign: 'Sagittarius', degree: '5°48\'', house: 'VI', element: 'Fire', retrograde: false },
  ],
  houses: [
    { number: 1, sign: 'Cancer', degree: 5.5 },
    { number: 2, sign: 'Leo', degree: 0.25 },
    { number: 3, sign: 'Virgo', degree: 2.5 },
    { number: 4, sign: 'Virgo', degree: 12.0 },
    { number: 5, sign: 'Libra', degree: 18.75 },
    { number: 6, sign: 'Sagittarius', degree: 2.33 },
    { number: 7, sign: 'Capricorn', degree: 5.5 },
    { number: 8, sign: 'Aquarius', degree: 0.25 },
    { number: 9, sign: 'Pisces', degree: 2.5 },
    { number: 10, sign: 'Pisces', degree: 12.0 },
    { number: 11, sign: 'Aries', degree: 18.75 },
    { number: 12, sign: 'Taurus', degree: 2.33 },
  ],
  aspects: [
    { planet1: 'Sun', planet2: 'Saturn', aspect: 'conjunction', orb: 3.02 },
    { planet1: 'Sun', planet2: 'Mars', aspect: 'square', orb: 0.33 },
    { planet1: 'Moon', planet2: 'Neptune', aspect: 'trine', orb: 7.7 },
    { planet1: 'Venus', planet2: 'Pluto', aspect: 'trine', orb: 2.47 },
    { planet1: 'Mercury', planet2: 'Neptune', aspect: 'square', orb: 3.38 },
    { planet1: 'Jupiter', planet2: 'Uranus', aspect: 'conjunction', orb: 2.7 },
    { planet1: 'Saturn', planet2: 'Mars', aspect: 'square', orb: 3.35 },
    { planet1: 'Mars', planet2: 'Lilith', aspect: 'conjunction', orb: 3.17 },
  ],
  points: {
    northNode: { sign: 'Virgo', degree: '1°20\'' },
    southNode: { sign: 'Pisces', degree: '1°20\'' },
    lilith: { sign: 'Leo', degree: '22°15\'' },
    partOfFortune: { sign: 'Sagittarius', degree: '7°55\'' },
    ascendant: { sign: 'Cancer', degree: '5°30\'' },
    midheaven: { sign: 'Pisces', degree: '12°00\'' },
  },
};
