import { NextRequest, NextResponse } from 'next/server';
import { jsonBadRequest, jsonOk, jsonServerError } from '@/lib/auth/http';
import { verifyBogCallbackSignature } from '@/lib/payments/bog';
import { syncBogOrder } from '@/lib/payments/bog-sync';

type BogCallbackPayload = {
  event?: string;
  body?: {
    order_id?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get('Callback-Signature');

    if (!verifyBogCallbackSignature(raw, signature)) {
      return NextResponse.json({ error: 'Invalid BOG signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw) as BogCallbackPayload;
    if (payload.event !== 'order_payment') {
      return jsonBadRequest('Unsupported BOG event');
    }

    const orderId = payload.body?.order_id;
    if (!orderId) return jsonBadRequest('Missing BOG order_id');

    const result = await syncBogOrder(orderId);
    if (!result.ok) return jsonBadRequest(result.error);

    return jsonOk({ ok: true, state: result.state });
  } catch (error) {
    return jsonServerError(error, 'BOG callback failed');
  }
}