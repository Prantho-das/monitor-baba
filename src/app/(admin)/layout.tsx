'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      const isSuperAdmin = session.user.app_metadata?.is_super_admin === true;
      if (isSuperAdmin) {
        setIsAuthorized(true);
      } else {
        router.replace('/dashboard');
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="text-lg text-emerald-500 animate-[pulse-glow_1.5s_infinite_ease-in-out]">Verifying Admin Access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base text-textp flex flex-col">
      <header className="px-6 py-4 border-b border-hover flex justify-between items-center bg-card shadow-sm">
        <h2 className="m-0 text-xl font-bold bg-gradient-to-r from-accent to-indigo-500 bg-clip-text text-transparent">Mooonitooor Admin Panel</h2>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">Back to Dashboard</button>
      </header>
      <main className="p-6 flex-1">
        {children}
      </main>
    </div>
  );
}
