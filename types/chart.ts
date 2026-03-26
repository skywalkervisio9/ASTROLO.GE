// ============================================================
// Chart data types — Astrologer API request/response
// ============================================================

export interface BirthData {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  longitude: number;
  latitude: number;
  timezone: string;
}

export interface ChartData {
  subjects: unknown[];
  aspects: ChartAspect[];
  houses: ChartHouse[];
  distributions: unknown[];
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
}

export interface ChartHouse {
  number: number;
  sign: string;
  degree: number;
}

// Planet positions for mini-chart SVG rendering
export interface PlanetPosition {
  name: string;
  nameKa: string;
  glyph: string;
  eclipticDeg: number;
  signIndex: number;
  signDegree: string;
  house: string;
  radius: number;
  color: string;
}
