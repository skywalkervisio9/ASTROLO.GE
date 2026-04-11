// ============================================================
// POST /api/dev/test-synastry — Generate synastry from existing
// natal readings. Picks 2 most recent users by default.
// Dev-only: localhost + preview deployments.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateSynastryReading } from '@/lib/AIgeneration/pipeline';
import { generateInviteCode } from '@/lib/utils/invite';

export const maxDuration = 300; // 5 min timeout for AI generation

const isDevAllowed =
  process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

export async function POST(req: NextRequest) {
  if (!isDevAllowed) {
    return NextResponse.json({ error: 'Dev-only endpoint' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const user1Id: string | undefined = body.user1_id;
  const user2Id: string | undefined = body.user2_id;
  const forceType: 'couple' | 'friend' | undefined = body.relationship_type;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (
        step: string,
        status: 'progress' | 'done' | 'error' = 'progress',
        data?: Record<string, unknown>
      ) => {
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ step, status, ...data }) + '\n')
          );
        } catch {
          // Controller may be closed if client disconnected — log and continue
          console.warn('[test-synastry] Stream closed, cannot send:', step);
        }
      };

      try {
        const admin = createAdminSupabase();

        // ── Step 1: Find two users with natal readings ──
        send('Finding users with natal readings...');

        let query = admin
          .from('natal_readings')
          .select('user_id, analysis_en, created_at')
          .not('analysis_en', 'is', null)
          .order('created_at', { ascending: false });

        if (user1Id && user2Id) {
          query = query.in('user_id', [user1Id, user2Id]);
        } else {
          query = query.limit(10);
        }

        const { data: readings, error: readErr } = await query;
        if (readErr) throw new Error(`Failed to fetch natal readings: ${readErr.message}`);
        if (!readings || readings.length < 2) {
          throw new Error(`Need at least 2 natal readings, found ${readings?.length ?? 0}`);
        }

        // Deduplicate by user_id (keep most recent per user)
        const seen = new Set<string>();
        const unique = readings.filter((r) => {
          if (seen.has(r.user_id)) return false;
          seen.add(r.user_id);
          return true;
        });

        if (unique.length < 2) {
          throw new Error('Need at least 2 distinct users with natal readings');
        }

        const pick1 = user1Id ? unique.find((r) => r.user_id === user1Id) ?? unique[0] : unique[0];
        const pick2 = user2Id
          ? unique.find((r) => r.user_id === user2Id) ?? unique[1]
          : unique.find((r) => r.user_id !== pick1.user_id) ?? unique[1];

        if (pick1.user_id === pick2.user_id) {
          throw new Error('Cannot pair a user with themselves');
        }

        // ── Step 2: Fetch user profiles + chart data ──
        send('Fetching profiles and chart data...');

        const userIds = [pick1.user_id, pick2.user_id];

        const [{ data: profiles }, { data: charts }] = await Promise.all([
          admin.from('users').select('id, full_name, gender').in('id', userIds),
          admin.from('chart_data').select('user_id, chart_context').in('user_id', userIds),
        ]);

        if (!profiles || profiles.length < 2) {
          throw new Error('Could not find profiles for both users');
        }
        if (!charts || charts.length < 2) {
          throw new Error('Could not find chart_data for both users — both need natal readings first');
        }

        const profileA = profiles.find((p) => p.id === pick1.user_id)!;
        const profileB = profiles.find((p) => p.id === pick2.user_id)!;
        const chartA = charts.find((c) => c.user_id === pick1.user_id)!;
        const chartB = charts.find((c) => c.user_id === pick2.user_id)!;

        // ── Step 3: Determine relationship type ──
        let relationshipType: 'couple' | 'friend' = forceType ?? 'couple';
        if (!forceType && profileA.gender && profileB.gender) {
          relationshipType = profileA.gender === profileB.gender ? 'friend' : 'couple';
        }

        const nameA = profileA.full_name || 'Person A';
        const nameB = profileB.full_name || 'Person B';

        send(
          `Pairing: ${nameA} + ${nameB} as ${relationshipType} (${profileA.gender ?? '?'}/${profileB.gender ?? '?'})`
        );

        // ── Step 4: Create connection records ──
        send('Creating synastry connection...');

        // Check if connection already exists between these two
        const { data: existing } = await admin
          .from('synastry_connections')
          .select('id')
          .or(
            `and(inviter_id.eq.${pick1.user_id},invitee_id.eq.${pick2.user_id}),and(inviter_id.eq.${pick2.user_id},invitee_id.eq.${pick1.user_id})`
          )
          .limit(1);

        let connectionId: string;

        if (existing && existing.length > 0) {
          connectionId = existing[0].id;
          send('Using existing connection');

          // Delete old synastry reading if exists
          await admin.from('synastry_readings').delete().eq('connection_id', connectionId);
          await admin
            .from('synastry_connections')
            .update({ status: 'accepted', relationship_type: relationshipType })
            .eq('id', connectionId);
        } else {
          const inviteCode = generateInviteCode();

          await admin.from('invite_codes').insert({
            code: inviteCode,
            inviter_id: pick1.user_id,
            relationship_type: relationshipType,
            slot_number: 1,
            status: 'used',
            used_by: pick2.user_id,
            used_at: new Date().toISOString(),
          });

          const { data: conn, error: connErr } = await admin
            .from('synastry_connections')
            .insert({
              inviter_id: pick1.user_id,
              invitee_id: pick2.user_id,
              relationship_type: relationshipType,
              invite_code: inviteCode,
              slot_number: 1,
              status: 'accepted',
            })
            .select('id')
            .single();

          if (connErr) throw new Error(`Failed to create connection: ${connErr.message}`);
          connectionId = conn.id;
        }

        // ── Step 5: Generate synastry reading ──
        send(
          `Generating ${relationshipType} synastry reading for ${nameA} + ${nameB} (this takes ~45-90s)...`
        );

        const result = await generateSynastryReading({
          personAName: nameA,
          personAAnalysis: pick1.analysis_en,
          personAChartContext: chartA.chart_context,
          personBName: nameB,
          personBAnalysis: pick2.analysis_en,
          personBChartContext: chartB.chart_context,
          relationshipType,
        });

        // ── Step 6: Store reading ──
        send('Storing synastry reading...');

        const { error: synErr } = await admin.from('synastry_readings').insert({
          connection_id: connectionId,
          user1_id: pick1.user_id,
          user2_id: pick2.user_id,
          relationship_type: relationshipType,
          analysis_en: result.analysis,
          reading_ka: result.readingKa,
          reading_en: result.readingEn,
          prompt_version: 'SYSTEM-PROMPT-Couple_s4',
          model_call2: result.meta.modelCall2,
          tokens_call2_ka: result.meta.tokensCall2Ka,
          tokens_call2_en: result.meta.tokensCall2En,
          validation_warnings: result.meta.validationWarnings,
        });

        if (synErr) throw new Error(`Failed to store synastry reading: ${synErr.message}`);

        // Update connection status
        await admin
          .from('synastry_connections')
          .update({ status: 'reading_generated' })
          .eq('id', connectionId);

        // ── Done ──
        send('Synastry generation complete!', 'done', {
          connectionId,
          user1: { id: pick1.user_id, name: nameA },
          user2: { id: pick2.user_id, name: nameB },
          relationshipType,
          tokensKa: result.meta.tokensCall2Ka,
          tokensEn: result.meta.tokensCall2En,
          warnings: result.meta.validationWarnings,
        });
        try { controller.close(); } catch { /* already closed */ }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Test synastry error:', err);
        send(`Error: ${message}`, 'error');
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
