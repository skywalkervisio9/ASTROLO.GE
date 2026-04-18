// ============================================================
// POST /api/dev/test-user — Return an existing account with a natal reading,
// or create a new one (needs /loading for generation).
// Dev-only.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Allow local dev OR Vercel preview deployments; block production domain only
const isDevAllowed = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';

// GET /api/dev/test-user — Return the account whose chart was most recently generated
// ?offset=1 returns the second-to-last, etc.
export async function GET(request: Request) {
  if (!isDevAllowed) {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const admin = createAdminSupabase();
  const offset = parseInt(new URL(request.url).searchParams.get('offset') ?? '0', 10) || 0;

  // Find the most recently generated reading for any @astrolo.ge account
  const { data: readings } = await admin
    .from('natal_readings')
    .select('user_id, share_slug, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset);

  const reading = readings?.[0] ?? null;

  if (!reading) {
    return NextResponse.json({ error: 'No generated charts found' }, { status: 404 });
  }

  const { data: user } = await admin
    .from('users')
    .select('id, email')
    .eq('id', reading.user_id)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: 'No users found' }, { status: 404 });
  }

  // Force a known dev password on the auth user so signInWithPassword
  // works for ANY account — including ones originally created via
  // OAuth (Google/Apple), which start without a password. Dev-only.
  const password = user.email.startsWith('test-') ? 'testuser123' : 'testpass123!';
  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, { password });
  if (pwErr) {
    return NextResponse.json(
      { error: `Could not set dev password: ${pwErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email: user.email,
    password,
    shareSlug: reading.share_slug ?? null,
    hasReading: true,
  });
}

export async function POST(request: Request) {
  if (!isDevAllowed) {
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
  const name = randomGeorgianName(gender);

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
    account_type: 'free',
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

// PATCH /api/dev/test-user — Update account_type for the current user (dev only)
export async function PATCH(req: Request) {
  if (!isDevAllowed) {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, accountType } = body;

  if (!userId || !accountType) {
    return NextResponse.json({ error: 'userId and accountType required' }, { status: 400 });
  }

  const validTypes = ['free', 'premium', 'invited'];
  if (!validTypes.includes(accountType)) {
    return NextResponse.json({ error: 'Invalid accountType' }, { status: 400 });
  }

  const admin = createAdminSupabase();

  const updates: Record<string, unknown> = { account_type: accountType };
  // Premium unlocks natal chart; free/invited locks it
  if (accountType === 'premium') {
    updates.natal_chart_unlocked = true;
  } else if (accountType === 'free') {
    updates.natal_chart_unlocked = false;
  }

  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accountType });
}

// ── Random Georgian name generator ──

const FEMALE_FIRST = [
  'ანა', 'მარიამი', 'ნინო', 'თამარი', 'ელენე', 'სალომე', 'ნათია',
  'ეკა', 'მაია', 'ლიკა', 'სოფო', 'ქეთი', 'დარეჯანი', 'თეა',
  'ირინე', 'ნანა', 'მანანა', 'ხატია', 'ნუცა', 'ბარბარე',
];

const MALE_FIRST = [
  'გიორგი', 'ლუკა', 'ნიკა', 'დავითი', 'ალექსანდრე', 'ილია',
  'თორნიკე', 'ლაშა', 'გოგა', 'ზურაბი', 'ბექა', 'მიშა',
  'ვახტანგი', 'ანდრია', 'სანდრო', 'გრიგოლი', 'ნოდარი', 'არჩილი',
  'ლევანი', 'თემური',
];

const LAST_NAMES = [
  'გელაშვილი', 'ბერიძე', 'კაპანაძე', 'წიკლაური', 'მაისურაძე',
  'ლომიძე', 'ხარაიშვილი', 'ჯანელიძე', 'გოგიჩაიშვილი', 'თოდუა',
  'ნიკოლაიშვილი', 'ავალიანი', 'მეგრელიშვილი', 'ქუთათელაძე',
  'დვალიშვილი', 'ჩხეიძე', 'მიქელაძე', 'ხუციშვილი', 'ბაქრაძე',
  'სურმანიძე',
];

function randomGeorgianName(gender: 'female' | 'male'): string {
  const firsts = gender === 'female' ? FEMALE_FIRST : MALE_FIRST;
  const first = firsts[Math.floor(Math.random() * firsts.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}
