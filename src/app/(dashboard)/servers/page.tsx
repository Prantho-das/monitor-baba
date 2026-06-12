'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import ServerCard from '@/components/ServerCard';
import AddServerModal from '@/components/AddServerModal';
import { Search, Plus, TerminalSquare } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string | null;
}

interface MetricMap {
  [key: string]: {
    cpu_percent: number;
    ram_percent: number;
    disk_percent: number;
  };
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<MetricMap>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchServers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const res = await fetch('/api/servers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setServers(data);

        // Fetch latest metrics for each server to display progress bars
        const metricsMap: MetricMap = {};
        for (const s of data) {
          const detailRes = await fetch(`/api/servers/${s.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const detailData = await detailRes.json();
          if (detailData.metrics && detailData.metrics.length > 0) {
            metricsMap[s.id] = detailData.metrics[0];
          }
        }
        setLatestMetrics(metricsMap);
      }
    } catch (err) {
      console.error('Failed to retrieve servers list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();

    // Subscribe to realtime changes on servers table
    const serverChannel = supabase
      .channel('realtime-servers-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'servers' },
        () => {
          fetchServers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(serverChannel);
    };
  }, []);

  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.hostname && s.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.ip_address && s.ip_address.includes(searchQuery))
  );

  return (
    <>
      <TopBar title="Registered Infrastructure" />

      <div className="page-container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-texts" size={16} />
            <input
              type="text"
              className="glass-input pl-10"
              placeholder="Search servers by name, hostname, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setModalOpen(true)} className="btn-primary whitespace-nowrap">
            <Plus size={16} /> Add Server
          </button>
        </div>

        {loading ? (
          <div className="text-[15px] font-medium text-texts animate-pulse py-10">
            Querying connected assets...
          </div>
        ) : filteredServers.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-20 px-6 text-center border-dashed">
            <TerminalSquare size={48} className="text-texts mb-4" strokeWidth={1} />
            <h4 className="text-[17px] font-semibold text-textp tracking-tight">No servers match your criteria</h4>
            <p className="text-[14px] text-texts max-w-[400px] mx-auto mt-2 leading-relaxed">
              {servers.length === 0
                ? 'Deploy our agent to your servers to begin collecting telemetry.'
                : 'Try modifying your search criteria or register a new server.'}
            </p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                latestMetrics={latestMetrics[server.id]}
              />
            ))}
          </div>
        )}

        <AddServerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onServerAdded={fetchServers}
        />
      </div>
    </>
  );
}
