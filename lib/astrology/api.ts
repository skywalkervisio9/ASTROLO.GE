// ============================================================
// Astrologer API (RapidAPI) — server-side only
// Endpoints: birth-chart, synastry context
// ============================================================

import type { BirthData } from '@/types/chart';

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? 'astrologer.p.rapidapi.com';

interface AstrologerResponse {
  context: string;         // Text description for Claude
  chart_data: unknown;     // Structured JSON for frontend
}

/**
 * Get natal chart data for a single birth
 */
export async function getChartData(birthData: BirthData): Promise<{
  context: string;
  chartData: unknown;
}> {
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/api/v5/context/birth-chart`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
      },
      body: JSON.stringify({ subject: birthData }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Astrologer API error ${response.status}: ${text}`);
  }

  const data: AstrologerResponse = await response.json();
  return {
    context: data.context,
    chartData: data.chart_data,
  };
}

/**
 * Get synastry context for two births
 * Note: We use individual chart contexts for Claude, this is optional
 */
export async function getSynastryData(
  subject1: BirthData,
  subject2: BirthData
): Promise<unknown> {
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/api/v5/context/synastry`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
      },
      body: JSON.stringify({ subject1, subject2 }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Astrologer synastry API error ${response.status}: ${text}`);
  }

  return response.json();
}
