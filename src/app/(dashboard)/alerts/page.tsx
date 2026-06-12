'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import { Check, CheckCircle2, AlertTriangle, Info, BellRing } from 'lucide-react';
import AlertHeatmap from '@/components/AlertHeatmap';

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={16} className="text-critical" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'info':
      default:
        return <Info size={16} className="text-online" />;
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  return (
    <>
      <TopBar title="Alert History Log" />

      <div className="page-container max-w-[1000px]">
        <div className="flex justify-between items-center mb-8 border-b border-borderg pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-textp tracking-tight">System Events</h2>
            <span className="text-[13px] text-texts font-medium">
              {unreadAlerts.length} Unread / {alerts.length} Total Alerts Logged
            </span>
          </div>
          {unreadAlerts.length > 0 && (
            <button onClick={markAllRead} className="btn-secondary">
              <Check size={16} /> Mark All as Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-[15px] font-medium text-texts animate-pulse py-10">
            Querying alert history...
          </div>
        ) : (
          <>
            <AlertHeatmap alerts={alerts} />

            {alerts.length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-24 px-6 text-center border-dashed">
                <CheckCircle2 size={48} className="text-texts mb-4 opacity-50" strokeWidth={1} />
                <h4 className="text-[17px] font-semibold text-textp tracking-tight">No alerts logged yet</h4>
                <p className="text-[14px] text-texts max-w-[400px] mx-auto mt-2 leading-relaxed">
                  All connected servers are performing normally. No threshold violations recorded.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`glass-card p-5 flex flex-col gap-3 transition-all duration-200 ${alert.is_read ? 'opacity-60 hover:opacity-100' : 'border-l-2 border-l-borderg shadow-sm'}`}
                    style={{
                      borderLeftColor: alert.is_read ? 'var(--border-line)' : `var(--color-${alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'online'})`
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <strong className="text-[13px] font-semibold text-textp uppercase tracking-wider">
                          {alert.servers?.name || 'Server'}
                        </strong>
                      </div>
                      <span className="text-[11px] text-textm font-mono">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-end gap-4 ml-6">
                      <p className="text-[14px] text-texts leading-relaxed m-0 flex-1">
                        {alert.message}
                      </p>
                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="text-[12px] font-medium text-texts hover:text-textp transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded bg-hover outline-none border border-borderg"
                        >
                          <Check size={14} /> Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
