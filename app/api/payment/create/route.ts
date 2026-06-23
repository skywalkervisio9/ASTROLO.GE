import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PRICING } from '@/types/user';
import type { CreatePaymentRequest } from '@/types/api';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { asEnum } from '@/lib/auth/validators';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createBogOrder } from '@/lib/payments/bog';

const PRODUCT_LABEL: Record<CreatePaymentRequest['payment_type'], string> = {
  premium_upgrade: 'ASTROLO.GE Premium',
  natal_unlock: 'ASTROLO.GE Natal Unlock',
  invite_slot: 'ASTROLO.GE Synastry Slot',
};

export async function POST(req: NextRequest) {
  let insertedPaymentId: string | null = null;

  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const body: CreatePaymentRequest = await req.json();
    const payment_type = asEnum(body.payment_type, ['premium_upgrade', 'natal_unlock', 'invite_slot'] as const);
    const provider = asEnum(body.provider, ['tbc', 'bog'] as const);

    if (!payment_type || !provider) return jsonBadRequest('Invalid payment request');
    if (provider !== 'bog') return jsonBadRequest('Only BOG payments are wired right now');

    const baseAmount = PRICING[payment_type];
    if (!baseAmount) return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });

    const promoCode = typeof body.promo_code === 'string' ? body.promo_code.trim().toLowerCase() : '';
    let amount: number = baseAmount;
    const promoMetadata: Record<string, unknown> = {};

    if (promoCode === 'astrolo10') {
      if (payment_type !== 'premium_upgrade') return jsonBadRequest('Promo code astrolo10 is only valid for premium upgrade');
      amount = 10;
      promoMetadata.promo_code = 'astrolo10';
      promoMetadata.discount_amount = 5;
      promoMetadata.original_amount = baseAmount;
    } else if (promoCode === 'luka111') {
      // Percentage codes apply to every product, computed off its own base
      // price (premium ₾15 → ₾3; natal unlock & synastry slot ₾5 → ₾1).
      amount = Number((baseAmount * 0.2).toFixed(2));
      promoMetadata.promo_code = 'LUKA111';
      promoMetadata.discount_percent = 80;
      promoMetadata.original_amount = baseAmount;
    } else if (promoCode === 'skywalker') {
      amount = Number((baseAmount * 0.5).toFixed(2));
      promoMetadata.promo_code = 'SKYWALKER';
      promoMetadata.discount_percent = 50;
      promoMetadata.original_amount = baseAmount;
    } else if (promoCode) {
      return jsonBadRequest('Invalid promo code');
    }

    const admin = createAdminSupabase();
    const paymentId = randomUUID();
    const idempotencyKey = randomUUID();
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const callbackUrl = process.env.BOG_CALLBACK_URL ?? `${origin}/api/payment/bog/callback`;
    const returnUrl = `${origin}/api/payment/bog/return?payment_id=${paymentId}`;

    const metadata = {
      relationship_type: body.relationship_type,
      ...promoMetadata,
    };

    const { error: insertError } = await admin.from('payments').insert({
      id: paymentId,
      user_id: auth.authUser.id,
      payment_type,
      amount,
      provider,
      idempotency_key: idempotencyKey,
      status: 'pending',
      metadata,
    });

    if (insertError) throw insertError;
    insertedPaymentId = paymentId;

    const order = await createBogOrder({
      paymentId,
      amount,
      originalAmount: promoMetadata.original_amount as number | undefined,
      description: PRODUCT_LABEL[payment_type],
      productId: payment_type,
      callbackUrl,
      successUrl: returnUrl,
      failUrl: returnUrl,
      idempotencyKey,
    });

    const { error: updateError } = await admin
      .from('payments')
      .update({
        provider_order_id: order.orderId,
        metadata: {
          ...metadata,
          bog_order_id: order.orderId,
          bog_details_url: order.detailsUrl,
        },
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    return NextResponse.json({
      payment_id: paymentId,
      redirect_url: order.redirectUrl,
    });
  } catch (error: unknown) {
    if (insertedPaymentId) {
      try {
        await createAdminSupabase()
          .from('payments')
          .update({
            status: 'failed',
            metadata: { bog_create_error: error instanceof Error ? error.message : 'Unknown BOG create error' },
          })
          .eq('id', insertedPaymentId);
      } catch {}
    }
    return jsonServerError(error);
  }
}