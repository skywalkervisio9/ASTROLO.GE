// ============================================================
// GET /api/invite/validate/[code] — Validate an invite code
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { asNonEmptyString } from '@/lib/auth/validators';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    const code = asNonEmptyString(rawCode);
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Invalid invite code' });
    }
    const supabase = await createServerSupabase();

    const { data: invite } = await supabase
      .from('invite_codes')
      .select('*, inviter:inviter_id(full_name)')
      .eq('code', code)
      .eq('status', 'active')
      .single();

    if (!invite) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired invite code',
      });
    }

    return NextResponse.json({
      valid: true,
      relationship_type: invite.relationship_type,
      inviter_name: (invite.inviter as { full_name: string })?.full_name ?? null,
    });
  } catch {
    return NextResponse.json({ valid: false, error: 'Validation failed' });
  }
}
