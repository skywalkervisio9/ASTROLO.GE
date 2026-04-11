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

    // Listen for auth state changes (debounced to avoid double-fire during signOut→signIn)
    let authChangeTimer: ReturnType<typeof setTimeout> | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      () => {
        if (authChangeTimer) clearTimeout(authChangeTimer);
        authChangeTimer = setTimeout(() => {
          refreshSessionSnapshot();
        }, 300);
      }
    );

    // Listen for profile changes from dev panel (tier switches, etc.)
    const onProfileChanged = () => refreshSessionSnapshot();
    window.addEventListener('profile-changed', onProfileChanged);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-changed', onProfileChanged);
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setAuthUser(null);
  };

  return { user, authUser, loading, signOut };
}
