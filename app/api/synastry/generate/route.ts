// ============================================================
// POST /api/synastry/generate — Internal (INTERNAL_SECRET) or same logic
// as POST /api/synastry/start for background jobs.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runSynastryGeneration } from '@/lib/synastry/run-generation';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { connection_id } = await req.json() as { connection_id: string };
    if (!connection_id) return NextResponse.json({ error: 'Missing connection_id' }, { status: 400 });

    const result = await runSynastryGeneration(connection_id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({ status: result.status });
  } catch (error: unknown) {
    console.error('[synastry/generate] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
