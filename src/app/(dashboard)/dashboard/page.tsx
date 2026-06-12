'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import ServerCard from '@/components/ServerCard';
import Link from 'next/link';
import { Monitor, CheckCircle2, AlertTriangle, XCircle, TerminalSquare } from 'lucide-react';

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
        setRecentAlerts(alertsData.slice(0, 5));
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
          <div className="text-[15px] font-medium text-texts animate-pulse py-10">
            Initialising environment...
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Status Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card flex items-center justify-between p-6 hover:shadow-card-hover">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] text-texts uppercase tracking-wider font-semibold">Total Servers</h4>
                  <span className="text-3xl font-bold text-textp">{servers.length}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-hover flex items-center justify-center text-textp">
                  <Monitor size={24} />
                </div>
              </div>
              
              <div className="glass-card flex items-center justify-between p-6 border-l-2 border-l-online hover:shadow-card-hover">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] text-texts uppercase tracking-wider font-semibold">Online</h4>
                  <span className="text-3xl font-bold text-textp">{onlineCount}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-online/10 flex items-center justify-center text-online">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="glass-card flex items-center justify-between p-6 border-l-2 border-l-warning hover:shadow-card-hover">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] text-texts uppercase tracking-wider font-semibold">Warning</h4>
                  <span className="text-3xl font-bold text-textp">{warningCount}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <AlertTriangle size={24} />
                </div>
              </div>

              <div className="glass-card flex items-center justify-between p-6 border-l-2 border-l-critical hover:shadow-card-hover">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] text-texts uppercase tracking-wider font-semibold">Offline</h4>
                  <span className="text-3xl font-bold text-textp">{offlineCount}</span>
                </div>
                <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center text-critical">
                  <XCircle size={24} />
                </div>
              </div>
            </div>

            {/* Split dashboard into Server Grid and Recent Alerts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-base font-semibold text-textp flex items-center gap-2">
                    <Monitor size={18} className="text-texts" /> Active Infrastructure
                  </h3>
                  <Link href="/servers" className="text-[13px] text-textp font-medium hover:underline flex items-center gap-1">
                    Manage Servers <span>→</span>
                  </Link>
                </div>

                {servers.length === 0 ? (
                  <div className="glass-card flex flex-col items-center justify-center py-20 px-6 text-center border-dashed">
                    <TerminalSquare size={48} className="text-texts mb-4" strokeWidth={1} />
                    <h4 className="text-[17px] font-semibold text-textp tracking-tight">No infrastructure connected</h4>
                    <p className="text-[14px] text-texts max-w-[400px] mx-auto mt-2 leading-relaxed">
                      Deploy our lightweight agent to your servers to begin collecting telemetry and monitoring health.
                    </p>
                    <Link href="/servers" className="btn-primary mt-6">
                      Add New Server
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-base font-semibold text-textp flex items-center gap-2">
                    <TerminalSquare size={18} className="text-texts" /> Activity Stream
                  </h3>
                  <Link href="/alerts" className="text-[13px] text-textp font-medium hover:underline flex items-center gap-1">
                    Alert Log <span>→</span>
                  </Link>
                </div>

                <div className="glass-card p-0 h-auto min-h-[400px] flex flex-col overflow-hidden">
                  {recentAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-texts gap-3 p-8">
                      <CheckCircle2 size={32} className="text-online opacity-50" strokeWidth={1} />
                      <span className="text-[14px] font-medium">All systems operational</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} className="p-4 border-b border-borderg last:border-0 hover:bg-hover/50 transition-colors group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {alert.type === 'cpu_high' || alert.type === 'ram_high' || alert.type === 'disk_full' ? (
                                <AlertTriangle size={14} className="text-warning" />
                              ) : (
                                <XCircle size={14} className="text-critical" />
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                              <div className="flex justify-between items-center">
                                <strong className="text-[11px] text-textp uppercase tracking-wider font-semibold">
                                  {alert.servers?.name || 'System'}
                                </strong>
                                <span className="text-[11px] text-textm font-mono">
                                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[13px] text-texts leading-relaxed m-0 group-hover:text-textp transition-colors">{alert.message}</p>
                            </div>
                          </div>
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
