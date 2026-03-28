// POST /api/dev/migrate — Run pending migrations (dev only)
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const results: string[] = [];

  // Add share_slug column if missing
  const { error: colErr } = await admin
    .from('natal_readings')
    .select('share_slug')
    .limit(0);

  if (colErr?.message?.includes('does not exist')) {
    // Column doesn't exist yet — need to add it via raw SQL
    // Since we can't run DDL via PostgREST, we'll handle slugs at the app layer
    // and add the column via Supabase dashboard
    results.push('share_slug column missing — please add via Supabase SQL Editor:');
    results.push('ALTER TABLE public.natal_readings ADD COLUMN share_slug text UNIQUE;');
    results.push('CREATE UNIQUE INDEX idx_natal_readings_share_slug ON public.natal_readings(share_slug) WHERE share_slug IS NOT NULL;');
  } else {
    results.push('share_slug column already exists');
  }

  return NextResponse.json({ results });
}
