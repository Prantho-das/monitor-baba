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

  const formattedLastSeen = server.last_seen
    ? new Date(server.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <Link href={`/servers/${server.id}`} className="glass-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.name}>{server.name}</h3>
          <span style={styles.hostname}>{server.hostname || 'No hostname'}</span>
        </div>
        <div style={styles.statusGroup}>
          <span
            className={`pulse-indicator ${server.status}`}
            style={{ backgroundColor: getStatusColor(server.status) }}
          />
          <span style={{ ...styles.statusText, color: getStatusColor(server.status) }}>
            {server.status}
          </span>
        </div>
      </div>

      <div style={styles.gaugeGrid}>
        <MetricGauge
          value={latestMetrics?.cpu_percent ?? 0}
          label="CPU"
          color={
            (latestMetrics?.cpu_percent ?? 0) > 85
              ? 'var(--color-critical)'
              : 'var(--accent-cyan)'
          }
        />
        <MetricGauge
          value={latestMetrics?.ram_percent ?? 0}
          label="RAM"
          color={
            (latestMetrics?.ram_percent ?? 0) > 85
              ? 'var(--color-critical)'
              : 'var(--accent-violet)'
          }
        />
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

      <div style={styles.footer}>
        <div style={styles.meta}>
          <span style={styles.metaLabel}>IP Address:</span>
          <span style={styles.metaValue}>{server.ip_address || 'N/A'}</span>
        </div>
        <div style={styles.meta}>
          <span style={styles.metaLabel}>Last Seen:</span>
          <span style={styles.metaValue}>{formattedLastSeen}</span>
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
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  name: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  hostname: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusText: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  gaugeGrid: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    margin: '12px 0 24px 0',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-glass)',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  metaLabel: {
    color: 'var(--text-muted)',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
  },
  metaValue: {
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
};
