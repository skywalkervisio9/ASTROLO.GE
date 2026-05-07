// ============================================================
// GET /api/synastry/public?slug=&lang= — Share view (guest or participant)
// Guest: public readings only. Participant: may load private (+ auth cookie).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildSynastrySharePayload } from '@/lib/data/public-synastry';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const payload = await buildSynastrySharePayload(slug, lang);
    if ('error' in payload) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    if (!payload.isPublic) {
      const supabase = await createServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      const ok =
        !!user &&
        (user.id === payload.users.personA.id ||
          user.id === payload.users.personB.id);
      if (!ok) {
        return NextResponse.json({ error: 'Reading is private' }, { status: 403 });
      }
    }

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('[synastry/public] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 },
    );
  }
}
