// ============================================================
// Client hook: fetch user's natal reading from Supabase
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { NatalReading } from '@/types/reading';
import type { Language } from '@/types/user';

export function useReading(language: Language = 'ka') {
  const [reading, setReading] = useState<NatalReading | null>(null);
  const [chartData, setChartData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchReading() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch natal reading
        const { data: readingData, error: readingError } = await supabase
          .from('natal_readings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (readingError && readingError.code !== 'PGRST116') {
          throw readingError;
        }

        if (readingData) {
          // Select reading based on language preference
          const langReading = language === 'ka'
            ? readingData.reading_ka
            : readingData.reading_en;
          setReading(langReading as NatalReading);
        }

        // Fetch chart data
        const { data: chartRow } = await supabase
          .from('chart_data')
          .select('api_response, planets, houses, aspects, points')
          .eq('user_id', user.id)
          .single();

        if (chartRow) {
          setChartData(chartRow);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reading');
      } finally {
        setLoading(false);
      }
    }

    fetchReading();
  }, [language]);

  return { reading, chartData, loading, error };
}
