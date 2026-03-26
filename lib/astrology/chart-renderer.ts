// ============================================================
// Mini chart coordinate math for SVG rendering
// ASC at LEFT (270° SVG), counterclockwise for ecliptic
// ============================================================

/**
 * Convert ecliptic degrees to SVG angle
 * Places ASC at the leftmost point (270° in SVG coords)
 */
export function eclToAngle(eclipticDeg: number, ascEcliptic: number): number {
  return ((270 + (eclipticDeg - ascEcliptic)) % 360 + 360) % 360;
}

/**
 * Get x,y position on a circle for a given ecliptic degree
 */
export function positionOnChart(
  eclipticDeg: number,
  radius: number,
  ascEcliptic: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const angle = eclToAngle(eclipticDeg, ascEcliptic);
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/**
 * Get the zodiac sign index (0-11) from ecliptic degrees
 */
export function getSignIndex(eclipticDeg: number): number {
  return Math.floor(eclipticDeg / 30);
}

/**
 * Get degree within the zodiac sign (0-29)
 */
export function getSignDegree(eclipticDeg: number): number {
  return eclipticDeg % 30;
}
