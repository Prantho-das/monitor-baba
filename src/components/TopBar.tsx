'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  servers?: { name: string } | null;
}

export default function TopBar({ title }: { title: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadAlerts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const token = session.access_token;
    try {
      const res = await fetch('/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlerts(data.filter((a: Alert) => !a.is_read));
      }
    } catch (err) {
      console.error('Failed to load topbar alerts:', err);
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    fetchUnreadAlerts();

    // Listen for real-time insert of new alerts
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('Realtime alert received:', payload.new);
          // Reload alerts
          fetchUnreadAlerts();
        }
      )
      .subscribe();

    // Handle clicks outside of notification dropdown
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ all: true }),
      });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to mark alerts read:', err);
    }
  };

  return (
    <header style={styles.topbar}>
      <h2 style={styles.title}>{title}</h2>

      <div style={styles.actions} ref={dropdownRef}>
        <button
          onClick={toggleTheme}
          style={styles.themeBtn}
          title="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div style={styles.notificationWrapper}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={styles.bellBtn}
          >
            <span>🔔</span>
            {alerts.length > 0 && (
              <span style={styles.badge}>{alerts.length}</span>
            )}
          </button>

          {dropdownOpen && (
            <div style={styles.dropdown} className="glass-card">
              <div style={styles.dropdownHeader}>
                <span style={styles.dropdownTitle}>Alerts</span>
                {alerts.length > 0 && (
                  <button onClick={markAllRead} style={styles.clearBtn}>
                    Mark all read
                  </button>
                )}
              </div>

              <div style={styles.alertList}>
                {alerts.length === 0 ? (
                  <div style={styles.emptyAlerts}>No unread alerts</div>
                ) : (
                  alerts.slice(0, 5).map((alert) => (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setDropdownOpen(false)}
                      style={styles.alertItem}
                    >
                      <div style={styles.alertMeta}>
                        <span style={styles.alertDot} />
                        <span style={styles.alertServer}>
                          {alert.servers?.name || 'Server'}
                        </span>
                      </div>
                      <p style={styles.alertMsg}>{alert.message}</p>
                      <span style={styles.alertTime}>
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              <div style={styles.dropdownFooter}>
                <Link
                  href="/alerts"
                  onClick={() => setDropdownOpen(false)}
                  style={styles.viewAll}
                >
                  View All Alerts
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  topbar: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    borderBottom: '1px solid var(--border-glass)',
    position: 'sticky' as const,
    top: 0,
    background: 'rgba(3, 3, 15, 0.7)',
    backdropFilter: 'blur(12px)',
    zIndex: 90,
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  notificationWrapper: {
    position: 'relative' as const,
  },
  bellBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    position: 'relative' as const,
    color: 'var(--text-primary)',
    padding: '6px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  themeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    padding: '6px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    background: 'var(--color-critical)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '2px 6px',
    minWidth: '18px',
    textAlign: 'center' as const,
    boxShadow: 'var(--glow-critical)',
  },
  dropdown: {
    position: 'absolute' as const,
    right: 0,
    top: '40px',
    width: '320px',
    padding: '16px 0 0 0',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    animation: 'fadeIn 0.2s ease-out',
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px 12px 16px',
    borderBottom: '1px solid var(--border-glass)',
  },
  dropdownTitle: {
    fontWeight: '600',
    fontSize: '14px',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-cyan)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  alertList: {
    maxHeight: '280px',
    overflowY: 'auto' as const,
  },
  emptyAlerts: {
    padding: '24px',
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  alertItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-glass)',
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  alertMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  alertDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-critical)',
  },
  alertServer: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase' as const,
  },
  alertMsg: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  alertTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    alignSelf: 'flex-end',
  },
  dropdownFooter: {
    padding: '12px',
    textAlign: 'center' as const,
    borderTop: '1px solid var(--border-glass)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  viewAll: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
};
