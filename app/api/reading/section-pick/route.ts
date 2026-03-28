// ============================================================
// POST /api/reading/section-pick — Free user picks 1 extra section
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { FREE_PICKABLE } from '@/types/reading';
import { requireAuthContext } from '@/lib/auth/guards';
import { requireCsrfOrThrow } from '@/lib/auth/csrf';
import { jsonBadRequest, jsonConflict, jsonServerError } from '@/lib/auth/http';
import { asNonEmptyString } from '@/lib/auth/validators';

export async function POST(req: NextRequest) {
  try {
    await requireCsrfOrThrow();
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const { sectionKey: rawSectionKey } = await req.json() as { sectionKey?: string };
    const sectionKey = asNonEmptyString(rawSectionKey);
    if (!sectionKey) return jsonBadRequest('Invalid section key');

    // Validate section key
    if (!FREE_PICKABLE.includes(sectionKey)) {
      return jsonBadRequest('Invalid section key');
    }

    // Check user hasn't already picked
    const { data: profile } = await supabase
      .from('users')
      .select('free_section_pick, account_type')
      .eq('id', authUser.id)
      .single();

    if (profile?.free_section_pick) {
      return jsonConflict('Section already picked');
    }

    // Save pick
    const { error } = await supabase
      .from('users')
      .update({ free_section_pick: sectionKey })
      .eq('id', authUser.id);

    if (error) throw error;

    return NextResponse.json({ success: true, sectionKey });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}
