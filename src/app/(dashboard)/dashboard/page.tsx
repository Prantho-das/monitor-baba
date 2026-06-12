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
          <div className="text-base text-accent animate-[pulse-glow_1.5s_infinite_ease-in-out] py-10">
            Loading dashboard overview...
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Status Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="glass-card flex items-center gap-5 p-5">
                <span className="text-3xl">🖥️</span>
                <div>
                  <h4 className="text-xs text-texts uppercase font-medium mb-1">Total Servers</h4>
                  <span className="text-3xl font-bold text-textp">{servers.length}</span>
                </div>
              </div>
              <div className="glass-card flex items-center gap-5 p-5 border-l-4 border-l-emerald-500">
                <span className="text-3xl">🟢</span>
                <div>
                  <h4 className="text-xs text-texts uppercase font-medium mb-1">Online</h4>
                  <span className="text-3xl font-bold text-textp">{onlineCount}</span>
                </div>
              </div>
              <div className="glass-card flex items-center gap-5 p-5 border-l-4 border-l-amber-500">
                <span className="text-3xl">🟡</span>
                <div>
                  <h4 className="text-xs text-texts uppercase font-medium mb-1">Warning</h4>
                  <span className="text-3xl font-bold text-textp">{warningCount}</span>
                </div>
              </div>
              <div className="glass-card flex items-center gap-5 p-5 border-l-4 border-l-gray-500">
                <span className="text-3xl">🔴</span>
                <div>
                  <h4 className="text-xs text-texts uppercase font-medium mb-1">Offline</h4>
                  <span className="text-3xl font-bold text-textp">{offlineCount}</span>
                </div>
              </div>
            </div>

            {/* Split dashboard into Server Grid and Recent Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-5">
                <div className="flex justify-between items-center text-base font-semibold text-textp">
                  <h3>Active Infrastructure</h3>
                  <Link href="/servers" className="text-[13px] text-accent font-medium hover:underline">
                    Manage Servers →
                  </Link>
                </div>

                {servers.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-16 px-5 text-center">
                    <span className="text-5xl mb-4">🔌</span>
                    <h4 className="text-lg font-medium text-textp">No servers registered yet</h4>
                    <p className="text-sm text-texts max-w-[360px] mx-auto mt-2 leading-relaxed">
                      Register your first server to start monitoring its CPU, RAM and Disk status.
                    </p>
                    <Link href="/servers" className="btn-primary mt-4">
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

              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center text-base font-semibold text-textp">
                  <h3>Recent Alerts</h3>
                  <Link href="/alerts" className="text-[13px] text-accent font-medium hover:underline">
                    Alert Log →
                  </Link>
                </div>

                <div className="glass-card p-5 h-[420px] overflow-y-auto">
                  {recentAlerts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-texts gap-2 text-sm">
                      <span>🟢</span> All systems operational. No active alerts.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} className="pb-4 border-b border-borderg flex flex-col gap-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-critical shadow-neon" />
                            <strong className="text-xs text-textp uppercase tracking-wider">
                              {alert.servers?.name || 'Server'}
                            </strong>
                          </div>
                          <p className="text-[13px] text-texts leading-relaxed m-0">{alert.message}</p>
                          <span className="text-[10px] text-textm self-end">
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
