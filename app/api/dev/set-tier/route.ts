// ============================================================
// POST /api/dev/set-tier — Override account_type in DB
// Dev-only: localhost + preview deployments.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/guards';
import { createAdminSupabase } from '@/lib/supabase/admin';

const isDevAllowed =
  process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

const VALID_TIERS = ['free', 'invited', 'premium'] as const;
type Tier = (typeof VALID_TIERS)[number];

export async function POST(req: NextRequest) {
  if (!isDevAllowed) {
    return NextResponse.json({ error: 'Dev-only endpoint' }, { status: 403 });
  }

  const { authUser } = await getAuthContext();
  if (!authUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = body.tier as string;

  // Map composite dev tiers to DB values
  let dbTier: Tier;
  let natalUnlocked: boolean | undefined;

  switch (tier) {
    case 'free':
      dbTier = 'free';
      natalUnlocked = false;
      break;
    case 'premium':
      dbTier = 'premium';
      natalUnlocked = true;
      break;
    case 'premium-plus':
      dbTier = 'premium';
      natalUnlocked = true;
      break;
    case 'invited':
      dbTier = 'invited';
      natalUnlocked = false;
      break;
    case 'invited-plus':
      dbTier = 'invited';
      natalUnlocked = true;
      break;
    default:
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const update: Record<string, unknown> = { account_type: dbTier };
  if (natalUnlocked !== undefined) update.natal_chart_unlocked = natalUnlocked;

  const { error } = await admin
    .from('users')
    .update(update)
    .eq('id', authUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier: dbTier, natal_chart_unlocked: natalUnlocked });
}
