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

  return (
    <>
      <TopBar title={`Server: ${server.name}`} />

      <div className="page-container">
        <div style={styles.backHeader}>
          <Link href="/servers" style={styles.backLink}>
            ← Back to Servers List
          </Link>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger" style={styles.deleteBtn}>
            {deleting ? 'Deleting...' : '🗑️ Delete Server'}
          </button>
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
        </div>

        {/* Running Services */}
        {currentMetrics.services?.daemons && (
          <>
            <div style={styles.sectionTitle}>
              <h3>Running Services</h3>
            </div>
            <div className="glass-card" style={styles.servicesContainer}>
              {Object.entries(currentMetrics.services.daemons).map(([key, isRunning]) => (
                <div key={key} className={`service-badge ${isRunning ? 'active' : 'inactive'}`} style={styles.largeBadge}>
                  <span className="dot" style={styles.largeDot} />
                  {key}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Server Logs Terminal */}
        {currentMetrics.services?.logs && (
          <>
            <div style={styles.sectionTitle}>
              <h3>Server Logs (Live)</h3>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div className="terminal-header">
                <span>syslog (/var/log/syslog)</span>
                <span>Bash</span>
              </div>
              <div className="terminal-viewer">
                {currentMetrics.services.logs.sys || 'Waiting for logs...'}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div className="terminal-header">
                <span>nginx (/var/log/nginx/error.log)</span>
                <span>Bash</span>
              </div>
              <div className="terminal-viewer">
                {currentMetrics.services.logs.nginx || 'Waiting for logs...'}
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
};
