'use client';

import Link from 'next/link';
import { Activity, HardDrive, Cpu, MemoryStick } from 'lucide-react';

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

  const cpu = latestMetrics?.cpu_percent ?? 0;
  const ram = latestMetrics?.ram_percent ?? 0;
  const disk = latestMetrics?.disk_percent ?? 0;

  return (
    <Link href={`/servers/${server.id}`} className="glass-card flex flex-col p-5 no-underline hover:-translate-y-[2px] transition-all duration-200 group">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full`}
              style={{ 
                backgroundColor: getStatusColor(server.status),
                boxShadow: server.status !== 'offline' ? `0 0 8px ${getStatusColor(server.status)}` : 'none'
              }}
            />
            <h3 className="text-[15px] font-semibold text-textp m-0 tracking-tight group-hover:text-online transition-colors">{server.name}</h3>
          </div>
          <span className="text-[13px] text-texts font-mono">{server.ip_address || server.hostname || 'No Host'}</span>
        </div>
        <div className="text-right flex flex-col items-end">
           <span className="text-[11px] font-bold uppercase tracking-wider bg-hover px-2 py-1 rounded" style={{ color: getStatusColor(server.status) }}>
              {server.status}
           </span>
           <div className="text-[11px] text-textm mt-2 flex items-center gap-1">
             <Activity size={12} />
             {syncText}
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 my-2 mb-6">
        {/* CPU Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <div className="flex items-center gap-1.5 text-texts">
              <Cpu size={14} />
              <span className="font-medium uppercase tracking-wider text-[10px]">CPU</span>
            </div>
            <span className={`font-mono font-medium ${cpu > 85 ? 'text-critical' : 'text-textp'}`}>{cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${cpu > 85 ? 'bg-critical' : 'bg-online'}`} 
              style={{ width: `${Math.min(cpu, 100)}%` }} 
            />
          </div>
        </div>

        {/* RAM Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <div className="flex items-center gap-1.5 text-texts">
              <MemoryStick size={14} />
              <span className="font-medium uppercase tracking-wider text-[10px]">RAM</span>
            </div>
            <span className={`font-mono font-medium ${ram > 85 ? 'text-critical' : 'text-textp'}`}>{ram.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${ram > 85 ? 'bg-critical' : 'bg-online'}`} 
              style={{ width: `${Math.min(ram, 100)}%` }} 
            />
          </div>
        </div>

        {/* Disk Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[12px]">
            <div className="flex items-center gap-1.5 text-texts">
              <HardDrive size={14} />
              <span className="font-medium uppercase tracking-wider text-[10px]">Disk</span>
            </div>
            <span className={`font-mono font-medium ${disk > 90 ? 'text-critical' : 'text-textp'}`}>{disk.toFixed(1)}%</span>
          </div>
          <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${disk > 90 ? 'bg-critical' : 'bg-warning'}`} 
              style={{ width: `${Math.min(disk, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-borderg flex justify-between text-[12px]">
        <div className="flex flex-col gap-1">
          <span className="text-textm text-[10px] uppercase tracking-wider font-medium">Load Avg</span>
          <span className="text-textp font-mono">
            {loadAvg ? loadAvg.join(', ') : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-textm text-[10px] uppercase tracking-wider font-medium">Processes</span>
          <span className="text-textp font-mono">
            {processCount !== undefined ? processCount : 'N/A'}
          </span>
        </div>
      </div>
    </Link>
  );
}
