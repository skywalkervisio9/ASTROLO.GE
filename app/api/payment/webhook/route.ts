// ============================================================
// POST /api/payment/webhook — Bank async notifications
// Verifies signature and applies idempotent tier changes.
// ============================================================

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';
import { invalidateUserProfile } from '@/lib/data/public-reading';

type WebhookPayload = {
  event_id?: string;
  payment_id?: string;
  provider_tx_id?: string;
  status?: 'success' | 'failed';
};

function verifySignature(rawBody: string, signature: string | null, ts: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  if (!signature || !ts) return false;
  const signed = `${ts}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    const raw = await req.text();
    if (!verifySignature(raw, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw) as WebhookPayload;
    const paymentId = payload.payment_id;
    const eventId = payload.event_id;
    const status = payload.status;
    const providerTxId = payload.provider_tx_id;

    if (!paymentId || !eventId || !status) {
      return jsonBadRequest('Missing webhook fields');
    }

    const admin = createAdminSupabase();
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return jsonBadRequest('Payment not found');

    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
    if (metadata.last_webhook_id === eventId) {
      return jsonOk({ ok: true, idempotent: true });
    }

    if (status === 'success') {
      // Apply tier side effects once per payment.
      if (payment.status !== 'completed') {
        switch (payment.payment_type) {
          case 'premium_upgrade':
            await admin.from('users').update({ account_type: 'premium' }).eq('id', payment.user_id);
            invalidateUserProfile(payment.user_id);
            break;
          case 'natal_unlock':
            await admin.from('users').update({ natal_chart_unlocked: true }).eq('id', payment.user_id);
            invalidateUserProfile(payment.user_id);
            break;
          case 'invite_slot': {
            const { data: user } = await admin
              .from('users')
              .select('invite_slots_purchased')
              .eq('id', payment.user_id)
              .maybeSingle();
            await admin
              .from('users')
              .update({ invite_slots_purchased: (user?.invite_slots_purchased ?? 0) + 1 })
              .eq('id', payment.user_id);
            break;
          }
        }
      }
      await admin.from('payments').update({
        status: 'completed',
        provider_tx_id: providerTxId ?? payment.provider_tx_id,
        metadata: { ...metadata, last_webhook_id: eventId, verified_at: new Date().toISOString() },
      }).eq('id', paymentId);
    } else {
      await admin.from('payments').update({
        status: 'failed',
        metadata: { ...metadata, last_webhook_id: eventId, verified_at: new Date().toISOString() },
      }).eq('id', paymentId);
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonServerError(error, 'Webhook processing failed');
  }
}

