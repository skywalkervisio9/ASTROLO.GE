import { getChartData } from '@/lib/astrology/api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await getChartData({
        name: 'Test User',
        year: 1995,
        month: 10,
        day: 15,
        hour: 14,
        minute: 30,
        latitude: 41.7151,
        longitude: 44.8271,
        timezone: 'Asia/Tbilisi',
        city: 'თბილისი',
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}