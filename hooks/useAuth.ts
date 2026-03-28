// ============================================================
// Client hook: authentication state + user profile
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function refreshSessionSnapshot() {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json() as {
        authUser: { id: string; email: string } | null;
        profile: User | null;
      };
      setAuthUser(data.authUser);
      setUser(data.profile);
      setLoading(false);
    }

    refreshSessionSnapshot();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async () => {
        await refreshSessionSnapshot();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setAuthUser(null);
  };

  return { user, authUser, loading, signOut };
}
