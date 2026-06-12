'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard dashboard routes (require user session)
  const { loading, user } = useAuth(true);

  if (loading || !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingPulse}>Initialising Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main-content">
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
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
};
