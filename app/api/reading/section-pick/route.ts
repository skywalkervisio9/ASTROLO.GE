// ============================================================
// POST /api/reading/section-pick — Free user picks 1 extra section
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { FREE_PICKABLE } from '@/types/reading';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sectionKey } = await req.json();

    // Validate section key
    if (!FREE_PICKABLE.includes(sectionKey)) {
      return NextResponse.json(
        { error: 'Invalid section key' },
        { status: 400 }
      );
    }

    // Check user hasn't already picked
    const { data: profile } = await supabase
      .from('users')
      .select('free_section_pick, account_type')
      .eq('id', user.id)
      .single();

    if (profile?.free_section_pick) {
      return NextResponse.json(
        { error: 'Section already picked' },
        { status: 409 }
      );
    }

    // Save pick
    const { error } = await supabase
      .from('users')
      .update({ free_section_pick: sectionKey })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, sectionKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
