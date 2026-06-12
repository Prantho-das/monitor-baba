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

  return (
    <Link href={`/servers/${server.id}`} className="glass-card flex flex-col p-4 no-underline hover:-translate-y-1 hover:shadow-neon transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`pulse-indicator ${server.status}`}
              style={{ backgroundColor: getStatusColor(server.status) }}
            />
            <h3 className="text-base font-semibold text-textp m-0">{server.name}</h3>
          </div>
          <span className="text-xs text-texts mt-0.5">{server.ip_address || server.hostname || 'No Host'}</span>
        </div>
        <div className="text-right">
           <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: getStatusColor(server.status) }}>
              {server.status}
           </span>
           <div className="text-[10px] text-textm mt-1">Sync: {syncText}</div>
        </div>
      </div>

      <div className="flex justify-between items-center my-2 mb-4">
        <div className="scale-85 origin-left">
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
        <div className="scale-85 origin-center">
          <MetricGauge
            value={latestMetrics?.ram_percent ?? 0}
            label="RAM"
            color={
              (latestMetrics?.ram_percent ?? 0) > 85
                ? 'var(--color-critical)'
                : '#8b5cf6'
            }
          />
        </div>
        <div className="scale-85 origin-right">
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

      <div className="mt-auto pt-3 border-t border-borderg flex justify-between text-[11px] bg-muted/50 rounded p-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-textm text-[9px] uppercase tracking-wider">Load (1m, 5m, 15m)</span>
          <span className="text-textp font-semibold">
            {loadAvg ? loadAvg.join(', ') : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-textm text-[9px] uppercase tracking-wider">Processes</span>
          <span className="text-textp font-semibold">
            {processCount !== undefined ? processCount : 'N/A'}
          </span>
        </div>
      </div>
    </Link>
  );
}
