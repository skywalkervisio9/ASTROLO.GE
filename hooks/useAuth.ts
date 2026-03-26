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

    async function getUser() {
      const { data: { user: authData } } = await supabase.auth.getUser();

      if (authData) {
        setAuthUser({ id: authData.id, email: authData.email ?? '' });

        // Fetch profile from users table
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.id)
          .single();

        if (profile) {
          setUser(profile as User);
        }
      }

      setLoading(false);
    }

    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setAuthUser({ id: session.user.id, email: session.user.email ?? '' });

          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) setUser(profile as User);
        } else {
          setAuthUser(null);
          setUser(null);
        }
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
