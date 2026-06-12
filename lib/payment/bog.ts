import crypto from 'crypto';
import type { PaymentType } from '@/types/user';

const TOKEN_URL = 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
const API_URL = 'https://api.bog.ge/payments/v1';

type BogOrder = {
  id: string;
  _links: { redirect: { href: string }; details: { href: string } };
};

export type BogReceipt = {
  order_id: string;
  external_order_id?: string;
  order_status?: { key?: string };
  purchase_units?: { request_amount?: string; transfer_amount?: string };
  payment_detail?: { code?: string; transaction_id?: string; code_description?: string };
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function appUrl() {
  return required('NEXT_PUBLIC_APP_URL').replace(/\/$/, '');
}

export async function getBogToken() {
  const basic = Buffer.from(`${required('BOG_CLIENT_ID')}:${required('BOG_CLIENT_SECRET')}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`BOG auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string };
}

function productName(type: PaymentType) {
  if (type === 'premium_upgrade') return 'ASTROLO Premium';
  if (type === 'natal_unlock') return 'ASTROLO Natal Unlock';
  return 'ASTROLO Synastry Slot';
}

export async function createBogOrder(input: {
  paymentId: string;
  paymentType: PaymentType;
  amount: number;
  idempotencyKey: string;
  language?: 'ka' | 'en';
}) {
  const { access_token } = await getBogToken();
  const base = appUrl();

  const res = await fetch(`${API_URL}/ecommerce/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'Accept-Language': input.language ?? 'ka',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      callback_url: `${base}/api/payment/webhook`,
      external_order_id: input.paymentId,
      purchase_units: {
        currency: 'GEL',
        total_amount: input.amount,
        basket: [{
          product_id: input.paymentType,
          description: productName(input.paymentType),
          quantity: 1,
          unit_price: input.amount,
          total_price: input.amount,
        }],
      },
      redirect_urls: {
        success: `${base}/api/payment/callback?payment_id=${input.paymentId}&provider=bog`,
        fail: `${base}/api/payment/callback?payment_id=${input.paymentId}&provider=bog&failed=1`,
      },
      payment_method: ['card'],
      ttl: 15,
    }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`BOG order failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as BogOrder;
}

export async function getBogReceipt(orderId: string) {
  const { access_token } = await getBogToken();
  const res = await fetch(`${API_URL}/receipt/${orderId}`, {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`BOG receipt failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as BogReceipt;
}

export function isBogPaid(receipt: BogReceipt) {
  return receipt.order_status?.key === 'completed' && receipt.payment_detail?.code === '100';
}

export function isBogFailed(receipt: BogReceipt) {
  return receipt.order_status?.key === 'rejected';
}

export function verifyBogCallback(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const key = required('BOG_CALLBACK_PUBLIC_KEY').replace(/\\n/g, '\n');
  const normalized = signature.replace(/-/g, '+').replace(/_/g, '/');
  const sig = Buffer.from(normalized, 'base64');
  return crypto.verify('RSA-SHA256', Buffer.from(rawBody), key, sig);
}