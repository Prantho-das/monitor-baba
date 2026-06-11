'use client';

import Link from 'next/link';
import MetricGauge from './MetricGauge';

interface Server {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string | null;
  os_info?: string;
}

interface ServerMetrics {
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  services?: any;
}

export default function ServerCard({
  server,
  latestMetrics,
}: {
  server: Server;
  latestMetrics?: ServerMetrics;
}) {
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

  const calculateLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(lastSeen).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const syncText = calculateLastSeenText(server.last_seen);
  
  let services = latestMetrics?.services;
  if (typeof services === 'string') {
    try { services = JSON.parse(services); } catch (e) {}
  }

  const loadAvg = services?.loadAvg;
  const processCount = services?.processes;
  const daemons = services?.daemons;

  return (
    <Link href={`/servers/${server.id}`} className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.statusGroup}>
            <span
              className={`pulse-indicator ${server.status}`}
              style={{ backgroundColor: getStatusColor(server.status) }}
            />
            <h3 style={styles.name}>{server.name}</h3>
          </div>
          <span style={styles.hostname}>{server.ip_address || server.hostname || 'No Host'}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
           <span style={{ ...styles.statusText, color: getStatusColor(server.status) }}>
              {server.status}
           </span>
           <div style={styles.syncText}>Sync: {syncText}</div>
        </div>
      </div>

      <div style={styles.gaugeGrid}>
        <div style={styles.gaugeWrapper}>
          <MetricGauge
            value={latestMetrics?.cpu_percent ?? 0}
            label="CPU"
            color={
              (latestMetrics?.cpu_percent ?? 0) > 85
                ? 'var(--color-critical)'
                : 'var(--accent-cyan)'
            }
          />
        </div>
        <div style={styles.gaugeWrapper}>
          <MetricGauge
            value={latestMetrics?.ram_percent ?? 0}
            label="RAM"
            color={
              (latestMetrics?.ram_percent ?? 0) > 85
                ? 'var(--color-critical)'
                : 'var(--accent-violet)'
            }
          />
        </div>
        <div style={styles.gaugeWrapper}>
          <MetricGauge
            value={latestMetrics?.disk_percent ?? 0}
            label="Disk"
            color={
              (latestMetrics?.disk_percent ?? 0) > 90
                ? 'var(--color-critical)'
                : 'var(--color-warning)'
            }
          />
        </div>
      </div>

      <div style={styles.devopsBar}>
        <div style={styles.devopsItem}>
          <span style={styles.devopsLabel}>Load (1m, 5m, 15m)</span>
          <span style={styles.devopsValue}>
            {loadAvg ? loadAvg.join(', ') : 'N/A'}
          </span>
        </div>
        <div style={styles.devopsItem}>
          <span style={styles.devopsLabel}>Processes</span>
          <span style={styles.devopsValue}>
            {processCount !== undefined ? processCount : 'N/A'}
          </span>
        </div>
      </div>
    </Link>
  );
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    cursor: 'pointer',
    textDecoration: 'none',
    padding: '16px', // Compact padding
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  name: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  hostname: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusText: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'block',
  },
  syncText: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  gaugeGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '8px 0 16px 0',
  },
  gaugeWrapper: {
    transform: 'scale(0.85)', // Make gauges smaller
  },
  servicesRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto' as const,
    paddingBottom: '8px',
    marginBottom: '8px',
    scrollbarWidth: 'none' as const,
    whiteSpace: 'nowrap' as const,
  },
  devopsBar: {
    marginTop: 'auto',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-glass)',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    background: 'var(--bg-muted)',
    borderRadius: '4px',
    padding: '8px 12px',
  },
  devopsItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  devopsLabel: {
    color: 'var(--text-muted)',
    fontSize: '9px',
    textTransform: 'uppercase' as const,
  },
  devopsValue: {
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
};
