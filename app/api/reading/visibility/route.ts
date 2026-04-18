// ============================================================
// PATCH /api/reading/visibility — toggle a reading's is_public flag.
// Owner-only. Body: { isPublic: boolean }.
// Scope: acts on the authenticated user's natal reading.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: row } = await supabase
    .from('natal_readings')
    .select('is_public, share_slug')
    .eq('user_id', user.id)
    .maybeSingle();
  return NextResponse.json({
    isPublic: row?.is_public ?? true,
    slug: row?.share_slug ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { isPublic?: unknown } | null;
    if (typeof body?.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'Missing isPublic boolean' }, { status: 400 });
    }

    // RLS ensures the user can only update their own row.
    const { error } = await supabase
      .from('natal_readings')
      .update({ is_public: body.isPublic })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, isPublic: body.isPublic });
  } catch (error: unknown) {
    console.error('Visibility toggle error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
