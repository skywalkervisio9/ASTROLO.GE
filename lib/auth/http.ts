import { NextResponse } from 'next/server';

export function jsonOk<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export function jsonBadRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function jsonUnauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function jsonForbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function jsonConflict(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 409 });
}

export function jsonServerError(error: unknown, fallback = 'Unknown error') {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
