'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// TODO: Sir, ekhane apnar actual email add korben.
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
        // Not an admin, redirect to regular dashboard
        router.replace('/dashboard');
      }
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading || !isAuthorized) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingPulse}>Verifying Admin Access...</div>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ background: '#0f172a', minHeight: '100vh', color: '#fff' }}>
      <header style={styles.header}>
        <h2>Mooonitooor Admin Panel</h2>
        <button onClick={() => router.push('/dashboard')} style={styles.backBtn}>Back to Dashboard</button>
      </header>
      <main style={{ padding: '24px' }}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-main)',
  },
  loadingPulse: {
    fontSize: '18px',
    color: '#ff4757',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  }
};
