// ============================================================
// GET /api/payment/callback — Bank redirect after payment
// BOG redirect is verified through receipt lookup.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { asEnum } from '@/lib/auth/validators';
import { invalidateUserProfile } from '@/lib/data/public-reading';
import { reconcileAccountTypeAfterPurchase } from '@/lib/payment/tier';
import { getBogReceipt, isBogFailed, isBogPaid } from '@/lib/payment/bog';

export const runtime = 'nodejs';

type PaymentType = 'premium_upgrade' | 'natal_unlock' | 'invite_slot';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
type PaymentProvider = 'tbc' | 'bog';

type PaymentRecord = {
  id: string;
  user_id: string;
  payment_type: PaymentType;
  provider: PaymentProvider;
  status: PaymentStatus;
  provider_tx_id: string | null;
  metadata: Record<string, unknown> | null;
};

type AdminClient = ReturnType<typeof createAdminSupabase>;

function redirectPayment(req: NextRequest, state: string) {
  return NextResponse.redirect(new URL(`/?payment=${state}`, req.url));
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

async function markPaymentStatus(
  admin: AdminClient,
  payment: PaymentRecord,
  status: 'failed' | 'refunded',
  metadataPatch: Record<string, unknown>,
) {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  await admin
    .from('payments')
    .update({
      status,
      metadata: {
        ...metadata,
        ...metadataPatch,
        verified_at: new Date().toISOString(),
      },
    })
    .eq('id', payment.id);
}

async function handleBogCallback(req: NextRequest, admin: AdminClient, payment: PaymentRecord) {
  if (payment.status === 'completed') return redirectPayment(req, 'success');
  if (payment.status === 'failed') return redirectPayment(req, 'failed');
  if (payment.status === 'refunded') return redirectPayment(req, 'refunded');

  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
  const bogOrderId =
    typeof metadata.bog_order_id === 'string'
      ? metadata.bog_order_id
      : payment.provider_tx_id;

  if (!bogOrderId) {
    return redirectPayment(req, 'error');
  }

  const receipt = await getBogReceipt(bogOrderId);

  if (receipt.external_order_id && receipt.external_order_id !== payment.id) {
    return redirectPayment(req, 'error');
  }

  const metadataPatch = {
    bog_order_id: receipt.order_id,
    bog_status: receipt.order_status?.key ?? null,
    bog_transaction_id: receipt.payment_detail?.transaction_id ?? null,
    bog_payment_code: receipt.payment_detail?.code ?? null,
    bog_payment_code_description: receipt.payment_detail?.code_description ?? null,
  };

  if (isBogPaid(receipt)) {
    await completePayment(admin, payment, metadataPatch);
    return redirectPayment(req, 'success');
  }

  if (isBogFailed(receipt)) {
    await markPaymentStatus(admin, payment, 'failed', metadataPatch);
    return redirectPayment(req, 'failed');
  }

  if (receipt.order_status?.key === 'refunded') {
    await markPaymentStatus(admin, payment, 'refunded', metadataPatch);
    return redirectPayment(req, 'refunded');
  }

  return redirectPayment(req, 'processing');
}

async function handleTbcCallback(req: NextRequest, admin: AdminClient, payment: PaymentRecord) {
  const { searchParams } = new URL(req.url);
  const status = asEnum(searchParams.get('status'), ['success', 'failed'] as const);
  const providerTxId = searchParams.get('tx_id');

  if (!status) {
    return redirectPayment(req, 'error');
  }

  if (status === 'success') {
    if (payment.status !== 'completed') {
      await completePayment(admin, payment, {
        provider_tx_id: providerTxId ?? payment.provider_tx_id,
      });
    }

    return redirectPayment(req, 'success');
  }

  if (payment.status !== 'failed') {
    await markPaymentStatus(admin, payment, 'failed', {
      provider_tx_id: providerTxId ?? payment.provider_tx_id,
    });
  }

  return redirectPayment(req, 'failed');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const paymentId = searchParams.get('payment_id');
    const provider = asEnum(searchParams.get('provider'), ['tbc', 'bog'] as const);

    if (!paymentId || !provider) {
      return redirectPayment(req, 'error');
    }

    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error) throw error;

    const payment = data as PaymentRecord | null;

    if (!payment) {
      return redirectPayment(req, 'not_found');
    }

    if (payment.provider !== provider) {
      return redirectPayment(req, 'error');
    }

    if (provider === 'bog') {
      return await handleBogCallback(req, admin, payment);
    }

    return await handleTbcCallback(req, admin, payment);
  } catch (error) {
    console.error('Payment callback error:', error);
    return redirectPayment(req, 'error');
  }
}