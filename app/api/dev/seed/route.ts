// ============================================================
// POST /api/dev/seed — Seed test users + AI-generated readings
// Dev-only: creates Luka + Nino, generates natal + synastry
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateNatalReading } from '@/lib/AIgeneration/pipeline';
import { generateSynastryReading } from '@/lib/AIgeneration/pipeline';
import {
  TEST_USERS,
  LUKA_CHART_CONTEXT,
  NINO_CHART_CONTEXT,
  LUKA_CHART_DATA,
  NINO_CHART_DATA,
} from '@/lib/dev/test-charts';
import { generateInviteCode } from '@/lib/utils/invite';
import crypto from 'crypto';

function generateShareSlug(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}

export const maxDuration = 300; // 5 min timeout for AI generation

// Allow local dev OR Vercel preview deployments; block production domain only
const isDevAllowed = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

export async function POST() {
  if (!isDevAllowed) {
    return NextResponse.json({ error: 'Dev-only endpoint' }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (step: string, status: 'progress' | 'done' | 'error' = 'progress') => {
        controller.enqueue(encoder.encode(JSON.stringify({ step, status }) + '\n'));
      };

      try {
        const admin = createAdminSupabase();
        const luka = TEST_USERS.luka;
        const nino = TEST_USERS.nino;

        // ── Step 1: Clean up existing test users ──
        send('Cleaning up existing test data...');

        // Try to delete by email (handles cases where UUID changed)
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        for (const u of existingUsers?.users ?? []) {
          if (u.email === luka.email || u.email === nino.email) {
            await admin.auth.admin.deleteUser(u.id);
          }
        }

        // ── Step 2: Create auth users ──
        send('Creating test users...');

        const { data: lukaAuth, error: lukaErr } = await admin.auth.admin.createUser({
          email: luka.email,
          password: luka.password,
          email_confirm: true,
        });
        if (lukaErr) throw new Error(`Failed to create Luka auth: ${lukaErr.message}`);
        const lukaId = lukaAuth.user.id;

        const { data: ninoAuth, error: ninoErr } = await admin.auth.admin.createUser({
          email: nino.email,
          password: nino.password,
          email_confirm: true,
        });
        if (ninoErr) throw new Error(`Failed to create Nino auth: ${ninoErr.message}`);
        const ninoId = ninoAuth.user.id;

        // ── Step 3: Update public.users with birth data ──
        send('Setting up user profiles...');

        // Wait briefly for the trigger to create public.users rows
        await new Promise(r => setTimeout(r, 1000));

        const { error: lukaUpdateErr } = await admin.from('users').update({
          full_name: luka.full_name,
          birth_day: luka.birth_day,
          birth_month: luka.birth_month,
          birth_year: luka.birth_year,
          birth_hour: luka.birth_hour,
          birth_minute: luka.birth_minute,
          birth_city: luka.birth_city,
          birth_lat: luka.birth_lat,
          birth_lng: luka.birth_lng,
          birth_timezone: luka.birth_timezone,
          gender: luka.gender,
          account_type: luka.account_type,
          language: luka.language,
        }).eq('id', lukaId);

        if (lukaUpdateErr) throw new Error(`Failed to update Luka profile: ${lukaUpdateErr.message}`);

        const { error: ninoUpdateErr } = await admin.from('users').update({
          full_name: nino.full_name,
          birth_day: nino.birth_day,
          birth_month: nino.birth_month,
          birth_year: nino.birth_year,
          birth_hour: nino.birth_hour,
          birth_minute: nino.birth_minute,
          birth_city: nino.birth_city,
          birth_lat: nino.birth_lat,
          birth_lng: nino.birth_lng,
          birth_timezone: nino.birth_timezone,
          gender: nino.gender,
          account_type: nino.account_type,
          language: nino.language,
        }).eq('id', ninoId);

        if (ninoUpdateErr) throw new Error(`Failed to update Nino profile: ${ninoUpdateErr.message}`);

        // ── Step 4: Insert chart_data ──
        send('Storing chart data...');

        await admin.from('chart_data').insert({
          user_id: lukaId,
          api_response: LUKA_CHART_DATA,
          chart_context: LUKA_CHART_CONTEXT,
          planets: LUKA_CHART_DATA.planets,
          houses: LUKA_CHART_DATA.houses,
          aspects: LUKA_CHART_DATA.aspects,
          points: LUKA_CHART_DATA.points,
        });

        await admin.from('chart_data').insert({
          user_id: ninoId,
          api_response: NINO_CHART_DATA,
          chart_context: NINO_CHART_CONTEXT,
          planets: NINO_CHART_DATA.planets,
          houses: NINO_CHART_DATA.houses,
          aspects: NINO_CHART_DATA.aspects,
          points: NINO_CHART_DATA.points,
        });

        // ── Step 5: Generate natal reading for Luka ──
        send('Generating natal reading for ლუკა.პ (this takes ~45-65s)...');

        const natalResult = await generateNatalReading(LUKA_CHART_CONTEXT);

        send('Storing natal reading...');

        const { error: natalErr } = await admin.from('natal_readings').insert({
          user_id: lukaId,
          share_slug: generateShareSlug(),
          analysis_en: natalResult.analysis,
          reading_ka: natalResult.readingKa,
          reading_en: natalResult.readingEn,
          prompt_version: 'SYSTEM-PROMPT-8SEC_i6',
          model_call1: natalResult.meta.modelCall1,
          model_call2: natalResult.meta.modelCall2,
          tokens_call1: natalResult.meta.tokensCall1,
          tokens_call2_ka: natalResult.meta.tokensCall2Ka,
          tokens_call2_en: natalResult.meta.tokensCall2En,
          validation_warnings: natalResult.meta.validationWarnings,
        });

        if (natalErr) throw new Error(`Failed to store natal reading: ${natalErr.message}`);

        // ── Step 6: Create invite chain for synastry ──
        send('Setting up synastry connection...');

        const inviteCode = generateInviteCode();

        const { error: inviteErr } = await admin.from('invite_codes').insert({
          code: inviteCode,
          inviter_id: lukaId,
          relationship_type: 'couple',
          slot_number: 1,
          status: 'used',
          used_by: ninoId,
          used_at: new Date().toISOString(),
        });

        if (inviteErr) throw new Error(`Failed to create invite: ${inviteErr.message}`);

        const { data: connection, error: connErr } = await admin.from('synastry_connections').insert({
          inviter_id: lukaId,
          invitee_id: ninoId,
          relationship_type: 'couple',
          invite_code: inviteCode,
          slot_number: 1,
          status: 'accepted',
        }).select('id').single();

        if (connErr) throw new Error(`Failed to create connection: ${connErr.message}`);

        // ── Step 7: Generate synastry reading ──
        send('Generating couple synastry reading (this takes ~45-65s)...');

        const synastryResult = await generateSynastryReading(
          LUKA_CHART_CONTEXT,
          NINO_CHART_CONTEXT,
          'couple'
        );

        send('Storing synastry reading...');

        const { error: synErr } = await admin.from('synastry_readings').insert({
          connection_id: connection.id,
          user1_id: lukaId,
          user2_id: ninoId,
          relationship_type: 'couple',
          analysis_en: synastryResult.analysis,
          reading_ka: synastryResult.readingKa,
          reading_en: synastryResult.readingEn,
          prompt_version: 'SYSTEM-PROMPT-Couple_s3',
          model_call1: synastryResult.meta.modelCall1,
          model_call2: synastryResult.meta.modelCall2,
          tokens_call1: synastryResult.meta.tokensCall1,
          tokens_call2_ka: synastryResult.meta.tokensCall2Ka,
          tokens_call2_en: synastryResult.meta.tokensCall2En,
          validation_warnings: synastryResult.meta.validationWarnings,
        });

        if (synErr) throw new Error(`Failed to store synastry reading: ${synErr.message}`);

        // Update connection status
        await admin.from('synastry_connections')
          .update({ status: 'reading_generated' })
          .eq('id', connection.id);

        // ── Done ──
        send('Seed complete!', 'done');
        controller.close();

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Seed error:', err);
        send(`Error: ${message}`, 'error');
        controller.close();
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
