// ============================================================
// Client hook: fetch user's synastry connections and readings
// ============================================================

'use client';

import { useState, useEffect } from 'react';
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

type ApiConnection = {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  relationship_type: 'couple' | 'friend';
  status: string;
  partner_name?: string | null;
};

export function useSynastry(language: Language = 'ka') {
  const [connections, setConnections] = useState<SynastryConnectionWithReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch('/api/synastry/connections', { credentials: 'include' });
        if (res.status === 401) {
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as { connections: ApiConnection[] };

        const enriched = await Promise.all(
          (data.connections ?? []).map(async (conn) => {
            let reading: SynastryReading | null = null;
            if (conn.status === 'reading_generated') {
              const r = await fetch(`/api/synastry/reading/${conn.id}?lang=${language}`, { credentials: 'include' });
              if (r.ok) {
                const payload = await r.json() as { reading: SynastryReading | null };
                reading = payload.reading ?? null;
              }
            }
            return {
              id: conn.id,
              inviter_id: conn.inviter_id,
              invitee_id: conn.invitee_id,
              relationship_type: conn.relationship_type,
              status: conn.status,
              partnerName: conn.partner_name ?? null,
              reading,
            } satisfies SynastryConnectionWithReading;
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
