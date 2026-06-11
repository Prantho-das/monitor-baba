'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAuth = (requireAuth: boolean = true) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get active session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      if (requireAuth && !session) {
        router.replace('/login');
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (requireAuth && !session) {
          router.replace('/login');
        } else if (!requireAuth && session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          router.replace('/dashboard');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAuth, router]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return { user, loading, signOut };
};
