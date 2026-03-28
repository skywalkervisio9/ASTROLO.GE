// ============================================================
// GET /api/reading/natal — Get natal reading (tier-gated)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types/user';
import { SECTION_KEYS } from '@/types/reading';
import { requireAuthContext } from '@/lib/auth/guards';
import { jsonServerError } from '@/lib/auth/http';
import { canUserAccessSection } from '@/lib/auth/policy';

function gateSection(section: unknown) {
  if (!section || typeof section !== 'object') return section;

  // ContentSection
  if ('cards' in section) {
    const s = section as {
      sectionTitle?: string;
      sectionTagline?: string;
      cards?: Array<{
        id: string;
        label: string;
        title: string;
        body: string[];
        crossReferences?: string[];
        expandedContent?: string[] | null;
        hint?: unknown;
        accentElement?: unknown;
      }>;
      pullQuote?: string | null;
    };

    const first = s.cards?.[0];
    return {
      sectionTitle: s.sectionTitle ?? '',
      sectionTagline: s.sectionTagline ?? '',
      cards: first ? [{
        ...first,
        body: Array.isArray(first.body) && first.body[0] ? [String(first.body[0]).slice(0, 140) + '…'] : [],
        crossReferences: [],
        expandedContent: null,
        hint: null,
      }] : [],
      pullQuote: null,
    };
  }

  // OverviewSection
  if ('coreCards' in section) {
    const s = section as {
      sectionTitle?: string;
      sectionTagline?: string;
      planetTable?: unknown[];
      aspects?: unknown[];
      coreCards?: Array<{ id: string; label: string; title: string; body: string[] }>;
      pullQuote?: string | null;
    };
    const first = s.coreCards?.[0];
    return {
      sectionTitle: s.sectionTitle ?? '',
      sectionTagline: s.sectionTagline ?? '',
      planetTable: [],
      aspects: [],
      coreCards: first ? [{ ...first, body: first.body?.[0] ? [String(first.body[0]).slice(0, 140) + '…'] : [] }] : [],
      pullQuote: null,
    };
  }

  return section;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    if (auth.response) return auth.response;
    const { supabase, authUser } = auth;

    const url = new URL(req.url);
    const lang = (url.searchParams.get('lang') ?? 'ka') as 'ka' | 'en';

    // Profile may be missing briefly for brand new OAuth users (trigger delay),
    // or reading may be requested before profile is created. In that case,
    // return a safe "not generated yet" payload instead of 500.
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({
        reading: null,
        unlockedSections: [],
        freeSectionPick: null,
      });
    }

    const u = profile as User;

    const { data: row, error: readingError } = await supabase
      .from('natal_readings')
      .select('reading_ka, reading_en')
      .eq('user_id', authUser.id)
      .single();

    if (readingError) {
      // Not generated yet
      return NextResponse.json({
        reading: null,
        unlockedSections: [],
        freeSectionPick: u.free_section_pick ?? null,
      });
    }

    const full = (lang === 'ka' ? row.reading_ka : row.reading_en) as Record<string, unknown>;

    // Inject planetTable and aspects from chart_data into overview section
    const { data: chartRow } = await supabase
      .from('chart_data')
      .select('planets, aspects, points')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (chartRow && full.overview && typeof full.overview === 'object') {
      const overview = full.overview as Record<string, unknown>;
      if (!overview.planetTable && chartRow.planets) {
        overview.planetTable = chartRow.planets;
      }
      if (!overview.aspects && chartRow.aspects) {
        overview.aspects = chartRow.aspects;
      }
      if (!overview.points && chartRow.points) {
        overview.points = chartRow.points;
      }
    }

    // Keep shape stable for the client: always return all section keys,
    // but downgrade locked sections to a teaser payload.
    const gated: Record<string, unknown> = { ...full };
    const unlockedSections: string[] = [];

    for (const key of SECTION_KEYS) {
      const allowed = canUserAccessSection(u, key);
      if (allowed) {
        unlockedSections.push(key);
      } else {
        gated[key] = gateSection(full[key]);
      }
    }

    return NextResponse.json({
      reading: gated,
      unlockedSections,
      freeSectionPick: u.free_section_pick ?? null,
    });
  } catch (error: unknown) {
    return jsonServerError(error);
  }
}

