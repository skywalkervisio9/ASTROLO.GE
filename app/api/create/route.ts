// ============================================================
// POST /api/payment/create — Initialize payment session
// Supports TBC Pay and BOG payments
// ============================================================

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PRICING } from '@/types/user';
import type { CreatePaymentRequest } from '@/types/api';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { asEnum } from '@/lib/auth/validators';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { createBogOrder } from '@/lib/payment/bog';

type CreatePaymentBody = CreatePaymentRequest & {
  promo_code?: string;
  language?: 'ka' | 'en';
};

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();

    const auth = await requireAuthContext();
    if (auth.response) return auth.response;

    const { supabase, authUser } = auth;

    const body = (await req.json()) as CreatePaymentBody;

    const payment_type = asEnum(
      body.payment_type,
      ['premium_upgrade', 'natal_unlock', 'invite_slot'] as const,
    );

    const provider = asEnum(body.provider, ['tbc', 'bog'] as const);

    if (!payment_type || !provider) {
      return jsonBadRequest('Invalid payment request');
    }

    const promoCode =
      typeof body.promo_code === 'string'
        ? body.promo_code.trim().toLowerCase()
        : '';

    let amount: number = PRICING[payment_type];

    if (payment_type === 'premium_upgrade' && promoCode === 'astrolo10') {
      amount = 10;
    }

    if (payment_type === 'invite_slot' && promoCode === 'synastry2') {
      amount = 2.5;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const idempotencyKey = crypto.randomUUID();

    const baseMetadata = {
      relationship_type: body.relationship_type ?? null,
      promo_code: promoCode || null,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: authUser.id,
        payment_type,
        amount,
        provider,
        idempotency_key: idempotencyKey,
        status: 'pending',
        metadata: baseMetadata,
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    if (!payment?.id) {
      throw new Error('Payment record was not created');
    }

    let redirectUrl: string;

    if (provider === 'tbc') {
      // TODO: Wire TBC Pay here later.
      redirectUrl = `/api/payment/callback?payment_id=${payment.id}&provider=tbc`;
    } else {
      const order = await createBogOrder({
        paymentId: payment.id,
        paymentType: payment_type,
        amount,
        idempotencyKey,
        language: body.language ?? 'ka',
      });

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          provider_tx_id: order.id,
          metadata: {
            ...baseMetadata,
            bog_order_id: order.id,
            bog_details_url: order._links.details.href,
            bog_redirect_url: order._links.redirect.href,
          },
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      redirectUrl = order._links.redirect.href;
    }

    return NextResponse.json({
      payment_id: payment.id,
      redirect_url: redirectUrl,
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}