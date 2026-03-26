// ============================================================
// Client hook: fetch user's synastry connections and readings
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SynastryReading } from '@/types/synastry';
import type { Language } from '@/types/user';

interface SynastryConnectionWithReading {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  relationship_type: 'couple' | 'friend';
  status: string;
  partnerName: string | null;
  reading: SynastryReading | null;
}

export function useSynastry(language: Language = 'ka') {
  const [connections, setConnections] = useState<SynastryConnectionWithReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchConnections() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch all connections where user is inviter or invitee
        const { data: conns, error: connError } = await supabase
          .from('synastry_connections')
          .select('*')
          .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`);

        if (connError) throw connError;
        if (!conns) {
          setLoading(false);
          return;
        }

        // For each connection, fetch the reading and partner name
        const enriched = await Promise.all(
          conns.map(async (conn) => {
            const partnerId = conn.inviter_id === user.id
              ? conn.invitee_id
              : conn.inviter_id;

            // Get partner name
            let partnerName: string | null = null;
            if (partnerId) {
              const { data: partner } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', partnerId)
                .single();
              partnerName = partner?.full_name ?? null;
            }

            // Get reading if generated
            let reading: SynastryReading | null = null;
            if (conn.status === 'reading_generated') {
              const { data: readingData } = await supabase
                .from('synastry_readings')
                .select('*')
                .eq('connection_id', conn.id)
                .single();

              if (readingData) {
                reading = (language === 'ka'
                  ? readingData.reading_ka
                  : readingData.reading_en) as SynastryReading;
              }
            }

            return {
              id: conn.id,
              inviter_id: conn.inviter_id,
              invitee_id: conn.invitee_id,
              relationship_type: conn.relationship_type,
              status: conn.status,
              partnerName,
              reading,
            };
          })
        );

        setConnections(enriched);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load synastry');
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, [language]);

  return { connections, loading, error };
}
