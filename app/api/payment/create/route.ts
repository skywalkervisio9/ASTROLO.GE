// ============================================================
// POST /api/payment/create — Initialize payment session
// Supports TBC Pay and BOG iPay (Georgian banks)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { PRICING } from '@/types/user';
import type { CreatePaymentRequest } from '@/types/api';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePaymentRequest = await req.json();
    const { payment_type, provider } = body;

    // Determine amount
    const amount = PRICING[payment_type];
    if (!amount) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    // Generate idempotency key
    const idempotencyKey = `${user.id}-${payment_type}-${Date.now()}`;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        payment_type,
        amount,
        provider,
        idempotency_key: idempotencyKey,
        status: 'pending',
        metadata: { relationship_type: body.relationship_type },
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    // TODO: Initialize payment session with bank
    // This depends on TBC/BOG API integration
    // For now, return the payment ID for the callback flow
    let redirectUrl: string;

    if (provider === 'tbc') {
      // TODO: Call TBC Pay API to create session
      // const session = await tbcPay.createSession({ amount, currency: 'GEL', ... });
      // redirectUrl = session.redirectUrl;
      redirectUrl = `/api/payment/callback?payment_id=${payment?.id}&provider=tbc`;
    } else {
      // TODO: Call BOG iPay API to create session
      // const session = await bogIPay.createSession({ amount, currency: 'GEL', ... });
      // redirectUrl = session.redirectUrl;
      redirectUrl = `/api/payment/callback?payment_id=${payment?.id}&provider=bog`;
    }

    return NextResponse.json({
      payment_id: payment?.id,
      redirect_url: redirectUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
