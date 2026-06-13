import crypto from 'crypto';

type JsonRecord = Record<string, unknown>;

let tokenCache: { token: string; expiresAt: number } | null = null;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function apiBase() {
  return process.env.BOG_API_BASE ?? 'https://api.bog.ge';
}

function stripUndefined<T extends JsonRecord>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

async function getBogAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const credentials = Buffer.from(`${env('BOG_CLIENT_ID')}:${env('BOG_CLIENT_SECRET')}`).toString('base64');
  const res = await fetch(env('BOG_OAUTH_URL'), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BOG token failed ${res.status}: ${text}`);

  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('BOG token response missing access_token');

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 300;
  const ttlMs = expiresIn > 1_000_000 ? 10 * 60_000 : expiresIn * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60_000, ttlMs - 60_000) };

  return data.access_token;
}

export type BogPaymentDetails = {
  order_id?: string;
  external_order_id?: string;
  order_status?: { key?: string; value?: string };
  purchase_units?: {
    request_amount?: string | number;
    transfer_amount?: string | number;
    total_amount?: string | number;
    currency_code?: string;
    currency?: string;
  };
  payment_detail?: {
    transaction_id?: string;
    transfer_method?: { key?: string; value?: string };
  };
};

export async function createBogOrder(input: {
  paymentId: string;
  amount: number;
  originalAmount?: number;
  description: string;
  productId: string;
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
  idempotencyKey: string;
}) {
  const token = await getBogAccessToken();
  const discount = input.originalAmount && input.originalAmount > input.amount
    ? Number((input.originalAmount - input.amount).toFixed(2))
    : undefined;

  const body = stripUndefined({
    callback_url: input.callbackUrl,
    external_order_id: input.paymentId,
    redirect_urls: {
      success: input.successUrl,
      fail: input.failUrl,
    },
    purchase_units: stripUndefined({
      currency: 'GEL',
      total_amount: input.amount,
      total_discount_amount: discount,
      basket: [
        stripUndefined({
          quantity: 1,
          unit_price: input.originalAmount ?? input.amount,
          unit_discount_price: discount,
          total_price: input.amount,
          product_id: input.productId,
          description: input.description,
        }),
      ],
    }),
  });

  const res = await fetch(`${apiBase()}/payments/v1/ecommerce/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ka',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BOG create order failed ${res.status}: ${text}`);

  const data = JSON.parse(text) as {
    id?: string;
    _links?: {
      redirect?: { href?: string };
      details?: { href?: string };
    };
  };

  const orderId = data.id;
  const redirectUrl = data._links?.redirect?.href;
  if (!orderId || !redirectUrl) throw new Error(`BOG create order response missing id/redirect: ${text}`);

  return {
    orderId,
    redirectUrl,
    detailsUrl: data._links?.details?.href ?? null,
    raw: data,
  };
}

export async function getBogPaymentDetails(orderId: string): Promise<BogPaymentDetails> {
  const token = await getBogAccessToken();
  const res = await fetch(`${apiBase()}/payments/v1/receipt/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BOG payment details failed ${res.status}: ${text}`);
  return JSON.parse(text) as BogPaymentDetails;
}

export function verifyBogCallbackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const publicKey = process.env.BOG_CALLBACK_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!publicKey) return process.env.NODE_ENV !== 'production';

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(rawBody);
  verifier.end();

  const clean = signature.trim();
  const sig = /^[a-f0-9]+$/i.test(clean) && clean.length % 2 === 0
    ? Buffer.from(clean, 'hex')
    : Buffer.from(clean, 'base64');

  return verifier.verify(publicKey, sig);
}