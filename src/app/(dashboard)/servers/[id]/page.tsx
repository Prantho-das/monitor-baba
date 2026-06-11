'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import MetricGauge from '@/components/MetricGauge';
import MetricChart from '@/components/MetricChart';
import AgentInstaller from '@/components/AgentInstaller';

interface Server {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string | null;
  api_key: string;
  os_info?: string;
}

interface MetricPoint {
  id: number;
  recorded_at: string;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  uptime_seconds: number;
  services?: any;
}

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [server, setServer] = useState<Server | null>(null);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadServerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const res = await fetch(`/api/servers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Server not found');
      }

      const data = await res.json();
      setServer(data.server);
      setMetrics(data.metrics || []);

      // Fetch incidents
      const incRes = await fetch(`/api/servers/${id}/metrics?type=incidents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.data || []);
      }
    } catch (err) {
      console.error('Failed to load server details:', err);
      router.push('/servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServerData();

    // Poll server metrics every 10 seconds for real-time updates
    const interval = setInterval(loadServerData, 10000);

    // Subscribe to realtime updates on this specific server
    const serverChannel = supabase
      .channel(`realtime-server-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servers', filter: `id=eq.${id}` },
        (payload) => {
          setServer((current) => (current ? { ...current, ...payload.new } : (payload.new as Server)));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(serverChannel);
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this server and all its logged metrics history? This action is irreversible.')) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/servers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        router.push('/servers');
      } else {
        alert('Failed to delete server.');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Failed to delete server:', err);
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'var(--color-online)';
      case 'warning':
        return 'var(--color-warning)';
      case 'offline':
      default:
        return 'var(--text-muted)';
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <>
        <TopBar title="Loading Details..." />
        <div className="page-container">
          <div style={styles.loadingPulse}>Querying device registry...</div>
        </div>
      </>
    );
  }

  if (!server) return null;

  const currentMetrics = metrics[0] || { cpu_percent: 0, ram_percent: 0, disk_percent: 0, uptime_seconds: 0 };
  
  let parsedServices = currentMetrics.services;
  if (typeof parsedServices === 'string') {
    try { parsedServices = JSON.parse(parsedServices); } catch(e) {}
  }

  return (
    <>
      <TopBar title={`Server: ${server.name}`} />

      <div className="page-container">
        <div style={styles.backHeader}>
          <Link href="/servers" style={styles.backLink}>
            ← Back to Servers List
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={loadServerData} disabled={loading} className="btn-secondary" style={styles.deleteBtn}>
              🔄 Refresh
            </button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger" style={styles.deleteBtn}>
              {deleting ? 'Deleting...' : '🗑️ Delete Server'}
            </button>
          </div>
        </div>

        {/* Server Specs Meta Box */}
        <div className="glass-card" style={styles.specsBox}>
          <div style={styles.specItem}>
            <span style={styles.specLabel}>Status</span>
            <div style={styles.statusGroup}>
              <span
                className={`pulse-indicator ${server.status}`}
                style={{ backgroundColor: getStatusColor(server.status) }}
              />
              <span style={{ fontWeight: '700', textTransform: 'uppercase', color: getStatusColor(server.status) }}>
                {server.status}
              </span>
            </div>
          </div>
          <div style={styles.specItem}>
            <span style={styles.specLabel}>IP Address</span>
            <span style={styles.specValue}>{server.ip_address || 'Waiting for agent connection...'}</span>
          </div>
          <div style={styles.specItem}>
            <span style={styles.specLabel}>OS Details</span>
            <span style={styles.specValue}>{server.os_info || 'N/A'}</span>
          </div>
          <div style={styles.specItem}>
            <span style={styles.specLabel}>System Uptime</span>
            <span style={styles.specValue}>{formatUptime(currentMetrics.uptime_seconds)}</span>
          </div>
          <div style={styles.specItem}>
            <span style={styles.specLabel}>Last Seen</span>
            <span style={styles.specValue}>
              {server.last_seen ? new Date(server.last_seen).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>

        {/* Gauges section */}
        <div style={styles.sectionTitle}>
          <h3>Real-time Utilization</h3>
        </div>
        <div className="glass-card" style={styles.gaugesContainer}>
          <MetricGauge
            value={currentMetrics.cpu_percent}
            label="CPU Usage"
            color={currentMetrics.cpu_percent > 85 ? 'var(--color-critical)' : 'var(--accent-cyan)'}
          />
          <MetricGauge
            value={currentMetrics.ram_percent}
            label="RAM Usage"
            color={currentMetrics.ram_percent > 85 ? 'var(--color-critical)' : 'var(--accent-violet)'}
          />
          <MetricGauge
            value={currentMetrics.disk_percent}
            label="Disk Space"
            color={currentMetrics.disk_percent > 90 ? 'var(--color-critical)' : 'var(--color-warning)'}
          />
        </div>

        {/* Historical Charts */}
        <div style={styles.sectionTitle}>
          <h3>Telemetry History (Last 30 cycles)</h3>
        </div>
        <div style={styles.chartsGrid}>
          <MetricChart
            data={metrics}
            metricKey="cpu_percent"
            label="CPU Utilization Trend"
            color="var(--accent-cyan)"
          />
          <MetricChart
            data={metrics}
            metricKey="ram_percent"
            label="Memory Footprint Trend"
            color="var(--accent-violet)"
          />
          <MetricChart
            data={metrics}
            metricKey="disk_percent"
            label="Disk Storage Trend"
            color="var(--color-warning)"
          />
          <MetricChart
            data={metrics}
            metricKey="network_in_mb"
            label="Network Download (RX)"
            color="#34d399"
          />
          <MetricChart
            data={metrics}
            metricKey="network_out_mb"
            label="Network Upload (TX)"
            color="#60a5fa"
          />
        </div>

        {/* Incident Timeline */}
        <div style={styles.sectionTitle}>
          <h3>Incident History Log</h3>
        </div>
        <div className="glass-card" style={{ padding: '0', marginBottom: '32px', overflow: 'hidden' }}>
          {incidents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No critical incidents recorded.
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {incidents.map((incident) => (
                <div key={incident.id} style={styles.incidentRow}>
                  <div style={styles.incidentTime}>
                    {new Date(incident.created_at).toLocaleString()}
                  </div>
                  <div style={{ ...styles.incidentType, color: incident.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)' }}>
                    {incident.type.toUpperCase()}
                  </div>
                  <div style={styles.incidentMsg}>
                    {incident.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Running Services */}
        {parsedServices?.daemons && (
          <>
            <div style={styles.sectionTitle}>
              <h3>Running Services</h3>
            </div>
            <div className="glass-card" style={styles.servicesContainer}>
              {Object.entries(parsedServices.daemons).map(([key, data]: [string, any]) => {
                const isRunning = typeof data === 'object' ? data.running : data;
                const cpu = typeof data === 'object' ? data.cpu : 0;
                const mem = typeof data === 'object' ? data.mem : 0;

                return (
                  <div key={key} className={`service-badge ${isRunning ? 'active' : 'inactive'}`} style={styles.largeBadge}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="dot" style={styles.largeDot} />
                      <span style={{ fontWeight: 'bold' }}>{key}</span>
                    </div>
                    {isRunning && typeof data === 'object' && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: '#aaa', fontWeight: 'normal' }}>
                        CPU: {cpu}% | RAM: {mem}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Server Logs Terminal */}
        {parsedServices?.logs && (
          <>
            <div style={styles.sectionTitle}>
              <h3>Server Logs (Live)</h3>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={styles.macTerminal}>
                <div style={styles.macHeader}>
                  <div style={styles.macButtons}>
                    <div style={{ ...styles.macBtn, background: '#ff5f56' }} />
                    <div style={{ ...styles.macBtn, background: '#ffbd2e' }} />
                    <div style={{ ...styles.macBtn, background: '#27c93f' }} />
                  </div>
                  <span>bash — /var/log/syslog</span>
                </div>
                <div style={styles.macBody}>
                  {parsedServices.logs.sys ? parsedServices.logs.sys.split('\n').map((line: string, i: number) => {
                    let color = 'var(--text-terminal-success)';
                    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) color = 'var(--text-terminal-error)';
                    else if (line.toLowerCase().includes('warn')) color = 'var(--text-terminal-warn)';
                    return <div key={i} style={{ color }}>{line}</div>;
                  }) : 'Waiting for logs...'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={styles.macTerminal}>
                <div style={styles.macHeader}>
                  <div style={styles.macButtons}>
                    <div style={{ ...styles.macBtn, background: '#ff5f56' }} />
                    <div style={{ ...styles.macBtn, background: '#ffbd2e' }} />
                    <div style={{ ...styles.macBtn, background: '#27c93f' }} />
                  </div>
                  <span>bash — /var/log/nginx/error.log</span>
                </div>
                <div style={styles.macBody}>
                  {parsedServices.logs.nginx ? parsedServices.logs.nginx.split('\n').map((line: string, i: number) => {
                    let color = 'var(--text-terminal-success)';
                    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) color = 'var(--text-terminal-error)';
                    else if (line.toLowerCase().includes('warn')) color = 'var(--text-terminal-warn)';
                    return <div key={i} style={{ color }}>{line}</div>;
                  }) : 'Waiting for logs...'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Installation details box */}
        <div style={styles.installationWrapper}>
          <AgentInstaller apiKey={server.api_key} />
        </div>
      </div>
    </>
  );
}

const styles = {
  backHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  backLink: {
    color: 'var(--accent-cyan)',
    fontSize: '14px',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  specsBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
    padding: '20px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  specLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  specValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    wordBreak: 'break-all' as const,
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  sectionTitle: {
    marginBottom: '16px',
    fontSize: '14px',
  },
  gaugesContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '24px',
    padding: '32px 20px',
    marginBottom: '32px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  servicesContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    padding: '24px',
    marginBottom: '32px',
  },
  largeBadge: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '16px',
  },
  largeDot: {
    width: '8px',
    height: '8px',
  },
  installationWrapper: {
    marginTop: '16px',
  },
  loadingPulse: {
    fontSize: '16px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
    padding: '40px 0',
  },
  incidentRow: {
    display: 'grid',
    gridTemplateColumns: '150px 100px 1fr',
    gap: '16px',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-glass)',
    alignItems: 'center',
    fontSize: '13px',
  },
  incidentTime: {
    color: 'var(--text-muted)',
    fontSize: '11px',
  },
  incidentType: {
    fontWeight: 'bold',
    fontSize: '11px',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    textAlign: 'center' as const,
  },
  incidentMsg: {
    color: 'var(--text-primary)',
  },
  macTerminal: {
    background: 'var(--bg-terminal)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid var(--border-glass)',
    boxShadow: 'var(--shadow-md)',
  },
  macHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    background: 'var(--bg-terminal-header)',
    borderBottom: '1px solid var(--border-glass)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontFamily: 'monospace',
    position: 'relative' as const,
  },
  macButtons: {
    display: 'flex',
    gap: '6px',
    position: 'absolute' as const,
    left: '16px',
  },
  macBtn: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  macBody: {
    padding: '16px',
    color: 'var(--text-terminal-success)',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflowY: 'auto' as const,
    maxHeight: '300px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: '1.5',
  },
};
