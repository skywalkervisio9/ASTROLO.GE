// ============================================================
// Google People API — best-effort DOB fetch for OAuth signups.
// Requires the `user.birthday.read` scope to have been requested.
// Many accounts only expose partial dates (no year), so any field
// may be null. Caller decides how to use the partial result.
// ============================================================

export type GoogleBirthday = {
  day: number | null;
  month: number | null;
  year: number | null;
};

type PeopleApiBirthday = {
  date?: { year?: number; month?: number; day?: number };
  metadata?: { primary?: boolean; source?: { type?: string } };
};

type PeopleApiResponse = {
  birthdays?: PeopleApiBirthday[];
};

/**
 * Fetch the user's birthday from Google People API.
 * Returns null on any error or when no birthday is set/visible.
 * Individual fields may be null even on success (Google allows DOB without year).
 */
export async function fetchGoogleBirthday(providerToken: string): Promise<GoogleBirthday | null> {
  try {
    const res = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      {
        headers: { Authorization: `Bearer ${providerToken}` },
        // The token is short-lived; no caching.
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      // Visibility-only: People API typically 403s when either the API is
      // not enabled on the GCP project, or the user.birthday.read scope
      // wasn't granted by Google (often because it's not in the OAuth
      // consent screen's scope list). Log the body so we can tell which.
      const errBody = await res.text().catch(() => '<unreadable>');
      console.warn('[google-people] non-OK', res.status, errBody.slice(0, 400));
      return null;
    }
    const body = (await res.json()) as PeopleApiResponse;
    console.log('[google-people] response birthdays:', JSON.stringify(body.birthdays ?? []));
    const list = body.birthdays ?? [];
    // Prefer the user-edited entry over the profile-derived one when both exist.
    const primary = list.find((b) => b.metadata?.source?.type === 'ACCOUNT')
      ?? list.find((b) => b.metadata?.primary)
      ?? list[0];
    const date = primary?.date;
    if (!date) {
      console.warn('[google-people] no date on primary birthday entry');
      return null;
    }
    return {
      day: typeof date.day === 'number' ? date.day : null,
      month: typeof date.month === 'number' ? date.month : null,
      year: typeof date.year === 'number' ? date.year : null,
    };
  } catch (e) {
    console.warn('[google-people] fetch threw:', e);
    return null;
  }
}
