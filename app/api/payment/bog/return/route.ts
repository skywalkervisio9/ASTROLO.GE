import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { syncBogOrder } from '@/lib/payments/bog-sync';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('payment_id');

  if (!paymentId) {
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }

  try {
    const admin = createAdminSupabase();
    const { data: payment } = await admin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment) return NextResponse.redirect(new URL('/?payment=not_found', req.url));

    if (payment.provider_order_id && payment.status !== 'completed') {
      await syncBogOrder(payment.provider_order_id);
    }

    const { data: fresh } = await admin
      .from('payments')
      .select('status, payment_type')
      .eq('id', paymentId)
      .maybeSingle();

    if (fresh?.status === 'completed') {
      if (fresh.payment_type === 'premium_upgrade' || fresh.payment_type === 'natal_unlock') {
        return NextResponse.redirect(new URL('/loading?mode=generate-full&payment=success', req.url));
      }
      return NextResponse.redirect(new URL('/?payment=success', req.url));
    }

    if (fresh?.status === 'failed') {
      return NextResponse.redirect(new URL('/?payment=failed', req.url));
    }

    return NextResponse.redirect(new URL('/?payment=processing', req.url));
  } catch {
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }
}