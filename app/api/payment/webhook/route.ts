// ============================================================
// POST /api/payment/webhook — Bank async notifications
// Verifies BOG callback signatures and applies idempotent tier changes.
// ============================================================

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';
import { invalidateUserProfile } from '@/lib/data/public-reading';
import { reconcileAccountTypeAfterPurchase } from '@/lib/payment/tier';
import { isBogFailed, isBogPaid, verifyBogCallback, type BogReceipt } from '@/lib/payment/bog';

export const runtime = 'nodejs';

type PaymentType = 'premium_upgrade' | 'natal_unlock' | 'invite_slot';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

type PaymentRecord = {
  id: string;
  user_id: string;
  payment_type: PaymentType;
  status: PaymentStatus;
  provider_tx_id: string | null;
  metadata: Record<string, unknown> | null;
};

type LegacyWebhookPayload = {
  event_id?: string;
  payment_id?: string;
  provider_tx_id?: string;
  status?: 'success' | 'failed';
};

type BogCallbackPayload = {
  event?: string;
  zoned_request_time?: string;
  body?: BogReceipt;
};

type AdminClient = ReturnType<typeof createAdminSupabase>;

function verifyLegacySignature(rawBody: string, signature: string | null, ts: string | null) {
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

async function applySuccessfulPayment(admin: AdminClient, payment: PaymentRecord) {
  if (payment.status === 'completed') return;

  switch (payment.payment_type) {
    case 'premium_upgrade':
      await admin
        .from('users')
        .update({ account_type: 'premium' })
        .eq('id', payment.user_id);
      invalidateUserProfile(payment.user_id);
      break;

    case 'natal_unlock':
      await admin
        .from('users')
        .update({ natal_chart_unlocked: true })
        .eq('id', payment.user_id);

      await reconcileAccountTypeAfterPurchase(payment.user_id);
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

      await reconcileAccountTypeAfterPurchase(payment.user_id);
      invalidateUserProfile(payment.user_id);
      break;
    }
  }
}

async function completePayment(
  admin: AdminClient,
  payment: PaymentRecord,
  metadataPatch: Record<string, unknown>,
) {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  await applySuccessfulPayment(admin, payment);

  await admin
    .from('payments')
    .update({
      status: 'completed',
      metadata: {
        ...metadata,
        ...metadataPatch,
        verified_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
}

async function failPayment(
  admin: AdminClient,
  payment: PaymentRecord,
  metadataPatch: Record<string, unknown>,
) {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  await admin
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        ...metadata,
        ...metadataPatch,
        verified_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
}

async function refundPayment(
  admin: AdminClient,
  payment: PaymentRecord,
  metadataPatch: Record<string, unknown>,
) {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  await admin
    .from('payments')
    .update({
      status: 'refunded',
      metadata: {
        ...metadata,
        ...metadataPatch,
        verified_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
}

async function getPaymentByLocalOrBogId(
  admin: AdminClient,
  localPaymentId: string | undefined,
  bogOrderId: string,
) {
  if (localPaymentId) {
    const { data, error } = await admin
      .from('payments')
      .select('*')
      .eq('id', localPaymentId)
      .maybeSingle();

    if (error) throw error;
    return data as PaymentRecord | null;
  }

  const { data, error } = await admin
    .from('payments')
    .select('*')
    .eq('provider_tx_id', bogOrderId)
    .maybeSingle();

  if (error) throw error;
  return data as PaymentRecord | null;
}

async function handleBogWebhook(req: NextRequest, raw: string) {
  const signature = req.headers.get('Callback-Signature');

  if (!verifyBogCallback(raw, signature)) {
    return NextResponse.json({ error: 'Invalid BOG signature' }, { status: 401 });
  }

  const payload = JSON.parse(raw) as BogCallbackPayload;
  const receipt = payload.body;

  if (payload.event !== 'order_payment' || !receipt?.order_id) {
    return jsonBadRequest('Invalid BOG callback payload');
  }

  const bogOrderId = receipt.order_id;
  const localPaymentId =
    typeof receipt.external_order_id === 'string'
      ? receipt.external_order_id
      : undefined;

  const admin = createAdminSupabase();
  const payment = await getPaymentByLocalOrBogId(admin, localPaymentId, bogOrderId);

  if (!payment) {
    return jsonBadRequest('Payment not found');
  }

  const metadataPatch = {
    bog_order_id: bogOrderId,
    bog_event: payload.event,
    bog_status: receipt.order_status?.key ?? null,
    bog_transaction_id: receipt.payment_detail?.transaction_id ?? null,
    bog_payment_code: receipt.payment_detail?.code ?? null,
    bog_payment_code_description: receipt.payment_detail?.code_description ?? null,
    bog_callback_time: payload.zoned_request_time ?? null,
  };

  if (isBogPaid(receipt)) {
    await completePayment(admin, payment, metadataPatch);
    return jsonOk({ ok: true });
  }

  if (isBogFailed(receipt)) {
    await failPayment(admin, payment, metadataPatch);
    return jsonOk({ ok: true });
  }

  if (receipt.order_status?.key === 'refunded') {
    await refundPayment(admin, payment, metadataPatch);
    return jsonOk({ ok: true });
  }

  return jsonOk({ ok: true, ignored_status: receipt.order_status?.key ?? null });
}

async function handleLegacyWebhook(req: NextRequest, raw: string) {
  const signature = req.headers.get('x-webhook-signature');
  const timestamp = req.headers.get('x-webhook-timestamp');

  if (!verifyLegacySignature(raw, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(raw) as LegacyWebhookPayload;
  const paymentId = payload.payment_id;
  const eventId = payload.event_id;
  const status = payload.status;
  const providerTxId = payload.provider_tx_id;

  if (!paymentId || !eventId || !status) {
    return jsonBadRequest('Missing webhook fields');
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) throw error;

  const payment = data as PaymentRecord | null;
  if (!payment) return jsonBadRequest('Payment not found');

  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  if (metadata.last_webhook_id === eventId) {
    return jsonOk({ ok: true, idempotent: true });
  }

  if (status === 'success') {
    await completePayment(admin, payment, {
      last_webhook_id: eventId,
      provider_tx_id: providerTxId ?? payment.provider_tx_id,
    });
  } else {
    await failPayment(admin, payment, {
      last_webhook_id: eventId,
      provider_tx_id: providerTxId ?? payment.provider_tx_id,
    });
  }

  return jsonOk({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    if (req.headers.get('Callback-Signature')) {
      return await handleBogWebhook(req, raw);
    }

    return await handleLegacyWebhook(req, raw);
  } catch (error) {
    return jsonServerError(error, 'Webhook processing failed');
  }
}