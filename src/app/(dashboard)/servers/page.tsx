'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import ServerCard from '@/components/ServerCard';
import AddServerModal from '@/components/AddServerModal';

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

        // Fetch latest metrics for each server to display gauges
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
        <div style={styles.actionHeader}>
          <input
            type="text"
            className="glass-input"
            placeholder="🔍 Search servers by name, hostname, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchBar}
          />
          <button onClick={() => setModalOpen(true)} className="btn-primary" style={styles.addBtn}>
            ➕ Add Server
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingPulse}>Querying connected assets...</div>
        ) : filteredServers.length === 0 ? (
          <div className="glass-card" style={styles.emptyCard}>
            <span style={styles.emptyIcon}>🔍</span>
            <h4>No servers match your search</h4>
            <p style={styles.emptyText}>
              {servers.length === 0
                ? 'Register a server to start collecting status indicators.'
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

const styles = {
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  searchBar: {
    flex: 1,
    minWidth: '280px',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  loadingPulse: {
    fontSize: '16px',
    color: 'var(--accent-cyan)',
    animation: 'pulse-glow 1.5s infinite ease-in-out',
    padding: '40px 0',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
    maxWidth: '360px',
    margin: '8px auto 0 auto',
    lineHeight: '1.6',
  },
};
