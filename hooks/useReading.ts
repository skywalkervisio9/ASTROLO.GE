// ============================================================
// Client hook: fetch user's natal reading from Supabase
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import type { NatalReading } from '@/types/reading';
import type { Language } from '@/types/user';

export function useReading(language: Language = 'ka') {
  const [reading, setReading] = useState<NatalReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReading() {
      try {
        const res = await fetch(`/api/reading/natal?lang=${language}`, {
          credentials: 'include',
        });
        if (res.status === 401) {
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as { reading: NatalReading | null };
        setReading(data.reading ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reading');
      } finally {
        setLoading(false);
      }
    }

    fetchReading();
  }, [language]);

  return { reading, chartData: null, loading, error };
}
