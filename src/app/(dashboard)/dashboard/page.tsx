'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import ServerCard from '@/components/ServerCard';
import Link from 'next/link';

interface Server {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string | null;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  servers?: { name: string } | null;
}

interface MetricMap {
  [key: string]: {
    cpu_percent: number;
    ram_percent: number;
    disk_percent: number;
  };
}

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<MetricMap>({});
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;

      // 1. Fetch user's servers
      const serverRes = await fetch('/api/servers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const serversData = await serverRes.json();

      if (Array.isArray(serversData)) {
        setServers(serversData);

        // Fetch latest metrics for each server to populate gauges
        const metricsMap: MetricMap = {};
        for (const s of serversData) {
          const res = await fetch(`/api/servers/${s.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const detailData = await res.json();
          if (detailData.metrics && detailData.metrics.length > 0) {
            metricsMap[s.id] = detailData.metrics[0]; // Get the newest metrics entry
          }
        }
        setLatestMetrics(metricsMap);
      }

      // 2. Fetch user's alerts
      const alertRes = await fetch('/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const alertsData = await alertRes.json();
      if (Array.isArray(alertsData)) {
        setRecentAlerts(alertsData.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to realtime database changes for servers table (auto-refresh statuses)
    const serverChannel = supabase
      .channel('realtime-servers-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(serverChannel);
    };
  }, []);

  const onlineCount = servers.filter((s) => s.status === 'online').length;
  const offlineCount = servers.filter((s) => s.status === 'offline').length;
  const warningCount = servers.filter((s) => s.status === 'warning').length;

  return (
    <>
      <TopBar title="Dashboard Overview" />

      <div className="page-container">
        {loading ? (
          <div style={styles.loadingPulse}>Loading dashboard overview...</div>
        ) : (
          <div style={styles.content}>
            {/* Status Statistics Cards */}
            <div style={styles.statsGrid}>
              <div className="glass-card" style={styles.statCard}>
                <span style={styles.statIcon}>🖥️</span>
                <div>
                  <h4 style={styles.statTitle}>Total Servers</h4>
                  <span style={styles.statNumber}>{servers.length}</span>
                </div>
              </div>
              <div className="glass-card" style={{ ...styles.statCard, borderLeft: '3px solid var(--color-online)' }}>
                <span style={styles.statIcon}>🟢</span>
                <div>
                  <h4 style={styles.statTitle}>Online</h4>
                  <span style={styles.statNumber}>{onlineCount}</span>
                </div>
              </div>
              <div className="glass-card" style={{ ...styles.statCard, borderLeft: '3px solid var(--color-warning)' }}>
                <span style={styles.statIcon}>🟡</span>
                <div>
                  <h4 style={styles.statTitle}>Warning</h4>
                  <span style={styles.statNumber}>{warningCount}</span>
                </div>
              </div>
              <div className="glass-card" style={{ ...styles.statCard, borderLeft: '3px solid var(--text-muted)' }}>
                <span style={styles.statIcon}>🔴</span>
                <div>
                  <h4 style={styles.statTitle}>Offline</h4>
                  <span style={styles.statNumber}>{offlineCount}</span>
                </div>
              </div>
            </div>

            {/* Split dashboard into Server Grid and Recent Alerts */}
            <div style={styles.mainGrid}>
              <div style={styles.leftCol}>
                <div style={styles.sectionHeader}>
                  <h3>Active Infrastructure</h3>
                  <Link href="/servers" style={styles.link}>
                    Manage Servers →
                  </Link>
                </div>

                {servers.length === 0 ? (
                  <div className="glass-card" style={styles.emptyCard}>
                    <span style={styles.emptyIcon}>🔌</span>
                    <h4>No servers registered yet</h4>
                    <p style={styles.emptyText}>Register your first server to start monitoring its CPU, RAM and Disk status.</p>
                    <Link href="/servers" className="btn-primary" style={{ marginTop: '16px' }}>
                      Add Server
                    </Link>
                  </div>
                ) : (
                  <div className="dashboard-grid">
                    {servers.slice(0, 4).map((server) => (
                      <ServerCard
                        key={server.id}
                        server={server}
                        latestMetrics={latestMetrics[server.id]}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.rightCol}>
                <div style={styles.sectionHeader}>
                  <h3>Recent Alerts</h3>
                  <Link href="/alerts" style={styles.link}>
                    Alert Log →
                  </Link>
                </div>

                <div className="glass-card" style={styles.alertsPanel}>
                  {recentAlerts.length === 0 ? (
                    <div style={styles.emptyAlerts}>
                      <span>🟢</span> All systems operational. No active alerts.
                    </div>
                  ) : (
                    <div style={styles.alertList}>
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} style={styles.alertRow}>
                          <div style={styles.alertMeta}>
                            <span style={styles.alertDot} />
                            <strong style={styles.alertServerName}>
                              {alert.servers?.name || 'Server'}
                            </strong>
                          </div>
                          <p style={styles.alertMessage}>{alert.message}</p>
                          <span style={styles.alertTime}>
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
  },
  statIcon: {
    fontSize: '28px',
  },
  statTitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    fontWeight: '500',
    marginBottom: '4px',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '32px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '16px',
    fontWeight: '600',
  },
  link: {
    fontSize: '13px',
    color: 'var(--accent-cyan)',
    fontWeight: '500',
  },
  alertsPanel: {
    padding: '20px',
    height: '420px',
    overflowY: 'auto' as const,
  },
  emptyAlerts: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
    gap: '8px',
    fontSize: '14px',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  alertRow: {
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-glass)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  alertMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  alertDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-critical)',
    boxShadow: 'var(--glow-critical)',
  },
  alertServerName: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    textTransform: 'uppercase' as const,
  },
  alertMessage: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  alertTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    alignSelf: 'flex-end',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    maxWidth: '360px',
    margin: '8px auto 0 auto',
    lineHeight: '1.6',
  },
  loadingPulse: {
    fontSize: '16px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
    padding: '40px 0',
  },
};

// Handle responsive resizing using media query in JS context for split grid
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(max-width: 1024px)');
  const handleTabletChange = (e: MediaQueryListEvent | MediaQueryList) => {
    if (e.matches) {
      styles.mainGrid.gridTemplateColumns = '1fr';
    } else {
      styles.mainGrid.gridTemplateColumns = '2fr 1fr';
    }
  };
  mediaQuery.addEventListener('change', handleTabletChange);
  handleTabletChange(mediaQuery);
}
