// ============================================================
// POST /api/invite/create — Premium user generates invite link
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateInviteCode } from '@/lib/utils/invite';
import { canInvite } from '@/types/user';
import type { CreateInviteRequest } from '@/types/api';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateInviteRequest = await req.json();

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Count used invite codes
    const { count: usedSlots } = await supabase
      .from('invite_codes')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', user.id);

    if (!canInvite(profile, usedSlots ?? 0)) {
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
        inviter_id: user.id,
        relationship_type: body.relationship_type,
        slot_number: slotNumber,
      });

    if (codeError) throw codeError;

    // Create synastry connection (pending)
    await supabase
      .from('synastry_connections')
      .insert({
        inviter_id: user.id,
        relationship_type: body.relationship_type,
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
