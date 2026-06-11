'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
  servers?: { name: string } | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const res = await fetch('/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to query alerts log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Listen for realtime inserts on public alerts
    const channel = supabase
      .channel('realtime-alerts-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkRead = async (alertId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ alertId }),
      });

      if (res.ok) {
        setAlerts((current) =>
          current.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
        );
      }
    } catch (err) {
      console.error('Failed to mark alert read:', err);
    }
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ all: true }),
      });

      if (res.ok) {
        setAlerts((current) => current.map((a) => ({ ...a, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all alerts read:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'var(--color-critical)';
      case 'warning':
        return 'var(--color-warning)';
      case 'info':
      default:
        return 'var(--accent-cyan)';
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  return (
    <>
      <TopBar title="Alert History Log" />

      <div className="page-container">
        <div style={styles.actionHeader}>
          <div>
            <span style={styles.summaryText}>
              {unreadAlerts.length} Unread / {alerts.length} Total Alerts Logged
            </span>
          </div>
          {unreadAlerts.length > 0 && (
            <button onClick={markAllRead} className="btn-secondary" style={styles.markAllBtn}>
              ✓ Mark All as Read
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingPulse}>Querying alert history...</div>
        ) : alerts.length === 0 ? (
          <div className="glass-card" style={styles.emptyCard}>
            <span style={styles.emptyIcon}>🎉</span>
            <h4>No alerts logged yet</h4>
            <p style={styles.emptyText}>All connected servers are performing normally. No threshold violations recorded.</p>
          </div>
        ) : (
          <div style={styles.alertList}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="glass-card"
                style={{
                  ...styles.alertCard,
                  ...(alert.is_read ? styles.readCard : {}),
                  borderLeft: `3px solid ${getSeverityColor(alert.severity)}`,
                }}
              >
                <div style={styles.alertMeta}>
                  <div style={styles.serverInfo}>
                    <span style={styles.serverIcon}>🖥️</span>
                    <strong style={styles.serverName}>
                      {alert.servers?.name || 'Server'}
                    </strong>
                  </div>
                  <span style={styles.alertTime}>
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <div style={styles.alertBody}>
                  <p style={styles.alertMsg}>{alert.message}</p>
                  {!alert.is_read && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      style={styles.readBtn}
                      className="btn-secondary"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  summaryText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  markAllBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  loadingPulse: {
    fontSize: '16px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
    padding: '40px 0',
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
  alertList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  alertCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    transition: 'all 0.2s',
  },
  readCard: {
    opacity: 0.6,
  },
  alertMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  serverIcon: {
    fontSize: '16px',
  },
  serverName: {
    fontSize: '14px',
    color: '#fff',
    textTransform: 'uppercase' as const,
  },
  alertTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  alertBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
  },
  alertMsg: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    flex: 1,
  },
  readBtn: {
    padding: '6px 12px',
    fontSize: '12px',
  },
};
