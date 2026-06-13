import { createAdminSupabase } from '@/lib/supabase/admin';
import { invalidateUserProfile } from '@/lib/data/public-reading';
import { getBogPaymentDetails } from '@/lib/payments/bog';

function cents(value: unknown) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export async function syncBogOrder(orderId: string) {
  const admin = createAdminSupabase();

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('*')
    .eq('provider', 'bog')
    .eq('provider_order_id', orderId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!payment) return { ok: false as const, state: 'not_found' as const, error: 'Payment not found' };

  const details = await getBogPaymentDetails(orderId);
  const orderStatus = details.order_status?.key ?? 'unknown';
  const providerTxId = details.payment_detail?.transaction_id ?? null;
  const currency = details.purchase_units?.currency_code ?? details.purchase_units?.currency ?? 'GEL';
  const bogAmount = cents(
    details.purchase_units?.request_amount ??
    details.purchase_units?.transfer_amount ??
    details.purchase_units?.total_amount
  );
  const localAmount = cents(payment.amount);

  const metadata = {
    bog_order_id: orderId,
    bog_order_status: orderStatus,
    bog_transaction_id: providerTxId,
    bog_verified_at: new Date().toISOString(),
  };

  if (details.external_order_id && details.external_order_id !== payment.id) {
    await admin.rpc('fail_payment_once', {
      p_payment_id: payment.id,
      p_metadata: { ...metadata, bog_error: 'external_order_id_mismatch' },
    });
    return { ok: false as const, state: 'failed' as const, error: 'External order mismatch' };
  }

  if (orderStatus === 'completed') {
    if (currency !== 'GEL' || bogAmount === null || localAmount === null || bogAmount !== localAmount) {
      await admin.rpc('fail_payment_once', {
        p_payment_id: payment.id,
        p_metadata: { ...metadata, bog_error: 'amount_or_currency_mismatch', bog_amount: bogAmount, local_amount: localAmount, currency },
      });
      return { ok: false as const, state: 'failed' as const, error: 'Amount or currency mismatch' };
    }

    const { data: applied, error } = await admin.rpc('complete_payment_once', {
      p_payment_id: payment.id,
      p_provider_tx_id: providerTxId,
      p_metadata: metadata,
    });
    if (error) throw error;
    if (applied === true) invalidateUserProfile(payment.user_id);

    return { ok: true as const, state: 'completed' as const, paymentId: payment.id, applied: applied === true };
  }

  if (['rejected', 'failed', 'refunded', 'expired'].includes(orderStatus)) {
    const { error } = await admin.rpc('fail_payment_once', {
      p_payment_id: payment.id,
      p_metadata: metadata,
    });
    if (error) throw error;
    return { ok: true as const, state: 'failed' as const, paymentId: payment.id };
  }

  return { ok: true as const, state: 'pending' as const, paymentId: payment.id, orderStatus };
}