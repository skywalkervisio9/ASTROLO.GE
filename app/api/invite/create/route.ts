// ============================================================
// POST /api/invite/create — Premium user generates invite link
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateInviteCode } from '@/lib/utils/invite';
import type { CreateInviteRequest } from '@/types/api';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonServerError } from '@/lib/auth/http';
import { asEnum } from '@/lib/auth/validators';
import { canUserInvite } from '@/lib/auth/policy';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const body: CreateInviteRequest = await req.json();
    const relationshipType = asEnum(body.relationship_type, ['couple', 'friend'] as const);
    if (!relationshipType) {
      return jsonBadRequest('Invalid relationship_type');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Count used invite codes
    const { count: usedSlots } = await supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', authUser.id);

    if (!canUserInvite(profile, usedSlots ?? 0)) {
      return NextResponse.json(
        { error: 'No available invite slots', requires_payment: true },
        { status: 403 }
      );
    }

    // Generate unique code
    const code = generateInviteCode();
    const slotNumber = (usedSlots ?? 0) + 1;

    // Determine if this slot requires payment
    const freeSlots = profile.account_type === 'premium' ? 1 : 0;
    const requiresPayment = slotNumber > freeSlots;

    // Create invite code
    const { error: codeError } = await supabase
      .from('invite_codes')
      .insert({
        code,
        inviter_id: authUser.id,
        relationship_type: relationshipType,
        slot_number: slotNumber,
      });

    if (codeError) throw codeError;

    // Create synastry connection (pending)
    await supabase
      .from('synastry_connections')
      .insert({
        inviter_id: authUser.id,
        relationship_type: relationshipType,
        invite_code: code,
        slot_number: slotNumber,
        status: 'pending',
      });

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/inv/${code}`;

    return NextResponse.json({
      code,
      url,
      slot_number: slotNumber,
      requires_payment: requiresPayment,
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
