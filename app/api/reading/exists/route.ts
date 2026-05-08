import { NextRequest, NextResponse } from 'next/server';
import { getReadingExistsBySlug } from '@/lib/data/public-reading';

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }
  const exists = await getReadingExistsBySlug(slug);
  return NextResponse.json({ exists });
}
