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
    <div className="admin-container" style={{ minHeight: '100vh' }}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Mooonitooor Admin Panel</h2>
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
    borderBottom: '1px solid var(--border-glass)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-glass)',
    color: 'var(--text-primary)',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  }
};
