// ============================================================
// GET /api/payment/callback — Bank redirect after payment
// Verifies transaction and applies tier changes
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);

    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const providerTxId = searchParams.get('tx_id');

    if (!paymentId) {
      return NextResponse.redirect(new URL('/?payment=error', req.url));
    }

    // Fetch payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return NextResponse.redirect(new URL('/?payment=not_found', req.url));
    }

    // TODO: Verify transaction with bank API
    // const verified = await verifyWithBank(payment.provider, providerTxId);

    const isSuccess = status === 'success'; // Replace with bank verification

    if (isSuccess) {
      // Update payment status
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          provider_tx_id: providerTxId,
        })
        .eq('id', paymentId);

      // Apply tier change based on payment type
      switch (payment.payment_type) {
        case 'premium_upgrade':
          await supabase
            .from('users')
            .update({ account_type: 'premium' })
            .eq('id', payment.user_id);
          break;

        case 'natal_unlock':
          await supabase
            .from('users')
            .update({ natal_chart_unlocked: true })
            .eq('id', payment.user_id);
          break;

        case 'invite_slot':
          // Increment invite_slots_purchased
          const { data: user } = await supabase
            .from('users')
            .select('invite_slots_purchased')
            .eq('id', payment.user_id)
            .single();

          await supabase
            .from('users')
            .update({
              invite_slots_purchased: (user?.invite_slots_purchased ?? 0) + 1,
            })
            .eq('id', payment.user_id);
          break;
      }

      return NextResponse.redirect(new URL('/?payment=success', req.url));
    } else {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId);

      return NextResponse.redirect(new URL('/?payment=failed', req.url));
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }
}
