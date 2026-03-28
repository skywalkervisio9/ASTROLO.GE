// ============================================================
// POST /api/dev/test-user — Return an existing account with a natal reading,
// or create a new one (needs /loading for generation).
// Dev-only.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

// GET /api/dev/test-user — Return the account whose chart was most recently generated
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const admin = createAdminSupabase();

  // Find the most recently generated reading for any @astrolo.ge account
  const { data: reading } = await admin
    .from('natal_readings')
    .select('user_id, share_slug, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reading) {
    return NextResponse.json({ error: 'No generated charts found' }, { status: 404 });
  }

  const { data: user } = await admin
    .from('users')
    .select('id, email')
    .eq('id', reading.user_id)
    .like('email', '%@astrolo.ge')
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: 'No test users found' }, { status: 404 });
  }

  const password = user.email.startsWith('test-') ? 'testuser123' : 'testpass123!';

  return NextResponse.json({
    email: user.email,
    password,
    shareSlug: reading.share_slug ?? null,
    hasReading: true,
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const url = new URL(request.url);
  const forceNew = url.searchParams.get('new') === '1';

  // ── Try to find an existing @astrolo.ge account with a completed reading ──
  // Skip when ?new=1 — always create a fresh account for the Test User button.
  if (!forceNew) {
    const { data: existingUsers } = await admin
      .from('users')
      .select('id, email')
      .like('email', '%@astrolo.ge')
      .limit(50);

    if (existingUsers && existingUsers.length > 0) {
      const { data: readings } = await admin
        .from('natal_readings')
        .select('user_id, share_slug')
        .in('user_id', existingUsers.map((u) => u.id))
        .not('share_slug', 'is', null);

      if (readings && readings.length > 0) {
        const pick = readings[Math.floor(Math.random() * readings.length)];
        const user = existingUsers.find((u) => u.id === pick.user_id)!;
        const password = user.email.startsWith('test-') ? 'testuser123' : 'testpass123!';
        return NextResponse.json({
          email: user.email,
          password,
          shareSlug: pick.share_slug,
          hasReading: true,
        });
      }
    }
  }

  // ── Fallback: create a new user with chart data, send to /loading ──
  const id = Math.random().toString(36).slice(2, 8);
  const email = `test-${id}@astrolo.ge`;
  const password = 'testuser123';

  const birthYear = 1980 + Math.floor(Math.random() * 23);
  const birthMonth = 1 + Math.floor(Math.random() * 12);
  const birthDay = 1 + Math.floor(Math.random() * 28);
  const birthHour = Math.floor(Math.random() * 24);
  const birthMinute = Math.floor(Math.random() * 60);
  const genders = ['female', 'male'] as const;
  const gender = genders[Math.floor(Math.random() * 2)];
  const name = `Test ${id.toUpperCase()}`;

  const { data: authUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('users').upsert({
    id: authUser.user.id,
    email,
    full_name: name,
    birth_day: birthDay,
    birth_month: birthMonth,
    birth_year: birthYear,
    birth_hour: birthHour,
    birth_minute: birthMinute,
    birth_city: 'Tbilisi, Georgia',
    birth_lat: 41.7151,
    birth_lng: 44.8271,
    birth_timezone: 'Asia/Tbilisi',
    gender,
    account_type: 'premium',
  }, { onConflict: 'id' });

  // Don't insert hardcoded chart_data — let the /loading page trigger
  // the real pipeline: Astrologer API → Gemini → natal_readings.

  return NextResponse.json({
    email,
    password,
    hasReading: false,
    birthData: {
      name,
      birth_day: birthDay,
      birth_month: birthMonth,
      birth_year: birthYear,
      birth_hour: birthHour,
      birth_minute: birthMinute,
      birth_city: 'Tbilisi, Georgia',
      birth_lat: 41.7151,
      birth_lng: 44.8271,
      birth_timezone: 'Asia/Tbilisi',
      gender,
    },
  });
}
