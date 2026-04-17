// ============================================================
// POST /api/synastry/generate — Background synastry generation
// Called internally (fire-and-forget) from chart/generate after
// invited user's Call 1 completes and inviter also has Call 1.
// Protected by INTERNAL_SECRET header — not called by the client.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateSynastryReading } from '@/lib/AIgeneration/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // Internal-only endpoint — verify secret
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { connection_id } = await req.json() as { connection_id: string };
    if (!connection_id) return NextResponse.json({ error: 'Missing connection_id' }, { status: 400 });

    const admin = createAdminSupabase();

    // Load connection
    const { data: conn, error: connErr } = await admin
      .from('synastry_connections')
      .select('*')
      .eq('id', connection_id)
      .single();
    if (connErr || !conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

    // Idempotency: skip if already generating or complete
    if (conn.status === 'reading_generated') {
      return NextResponse.json({ status: 'already_complete' });
    }

    // Load both users' natal data (analysis_en + chart_context)
    const [{ data: inviterData }, { data: inviteeData }] = await Promise.all([
      admin
        .from('natal_readings')
        .select('analysis_en')
        .eq('user_id', conn.inviter_id)
        .single(),
      admin
        .from('natal_readings')
        .select('analysis_en')
        .eq('user_id', conn.invitee_id)
        .single(),
    ]);

    const [{ data: inviterChart }, { data: inviteeChart }] = await Promise.all([
      admin
        .from('chart_data')
        .select('chart_context')
        .eq('user_id', conn.inviter_id)
        .single(),
      admin
        .from('chart_data')
        .select('chart_context')
        .eq('user_id', conn.invitee_id)
        .single(),
    ]);

    if (!inviterData?.analysis_en || !inviteeData?.analysis_en) {
      return NextResponse.json({ error: 'Both users need Call 1 complete' }, { status: 400 });
    }

    // Load user names
    const { data: users } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', [conn.inviter_id, conn.invitee_id]);

    const nameMap = new Map((users ?? []).map(u => [u.id, u.full_name ?? 'Unknown']));

    // Run synastry generation
    const result = await generateSynastryReading({
      personAName: nameMap.get(conn.inviter_id) ?? 'Person A',
      personAAnalysis: inviterData.analysis_en,
      personAChartContext: inviterChart?.chart_context ?? '',
      personBName: nameMap.get(conn.invitee_id) ?? 'Person B',
      personBAnalysis: inviteeData.analysis_en,
      personBChartContext: inviteeChart?.chart_context ?? '',
      relationshipType: conn.relationship_type,
    });

    // Store synastry reading
    const { error: saveErr } = await admin
      .from('synastry_readings')
      .upsert({
        connection_id,
        user1_id: conn.inviter_id,
        user2_id: conn.invitee_id,
        relationship_type: conn.relationship_type,
        analysis_en: result.analysis,
        reading_ka: result.readingKa,
        reading_en: result.readingEn,
        model_call1: result.meta.modelCall1,
        model_call2: result.meta.modelCall2,
        tokens_call1: result.meta.tokensCall1,
        tokens_call2_ka: result.meta.tokensCall2Ka,
        tokens_call2_en: result.meta.tokensCall2En,
        validation_warnings: result.meta.validationWarnings,
      }, { onConflict: 'connection_id' });

    if (saveErr) throw saveErr;

    // Update connection status
    await admin
      .from('synastry_connections')
      .update({ status: 'reading_generated' })
      .eq('id', connection_id);

    return NextResponse.json({ status: 'complete' });
  } catch (error: unknown) {
    console.error('[synastry/generate] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
