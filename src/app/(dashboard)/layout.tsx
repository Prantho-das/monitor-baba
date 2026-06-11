'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard dashboard routes (require user session)
  const { loading } = useAuth(true);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingPulse}>Initialising Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      <main style={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#03030f',
  },
  mainContent: {
    flex: 1,
    marginLeft: '260px', // Matches Sidebar width
    minHeight: '100vh',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#03030f',
  },
  loadingPulse: {
    fontSize: '18px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
  },
};
