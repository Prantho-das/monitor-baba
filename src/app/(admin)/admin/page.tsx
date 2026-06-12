'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServers: 0,
    activeServers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // In a real app with RLS, the admin needs a special service role or an RPC function 
        // to bypass RLS to count all users. 
        // Here we do a basic fetch assuming the admin can see everything (requires proper RLS policies).
        
        const { count: serversCount } = await supabase
          .from('servers')
          .select('*', { count: 'exact', head: true });
          
        const { count: activeCount } = await supabase
          .from('servers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'online');

        setStats({
          totalUsers: 0, // Profile count needs DB function if RLS prevents it
          totalServers: serversCount || 0,
          activeServers: activeCount || 0,
        });
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <div>Loading global stats...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>System Overview</h1>
      
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Servers</h3>
          <p style={styles.cardValue}>{stats.totalServers}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Online Servers</h3>
          <p style={styles.cardValue} className="text-success">{stats.activeServers}</p>
        </div>
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <h3>Admin Actions</h3>
        <p style={{ color: '#aaa', marginTop: '8px', fontSize: '14px' }}>
          This is your private admin space. You can add global user management or server deletion tools here.
        </p>
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: '14px',
    color: '#aaa',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: 'bold',
  }
};
