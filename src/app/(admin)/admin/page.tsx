'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalServers: 0,
    activeServers: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch global server stats
      const { count: serversCount } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true });
        
      const { count: activeCount } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      // Fetch users from our secure admin API
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        
        setStats({
          totalUsers: data.users?.length || 0,
          totalServers: serversCount || 0,
          activeServers: activeCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${isBanned ? 'unban' : 'ban'} this user?`)) return;
    
    setProcessingId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          action: isBanned ? 'unban' : 'ban'
        })
      });

      if (res.ok) {
        // Refresh data
        await loadData();
      } else {
        alert('Failed to update user status');
      }
    } catch (err) {
      console.error('Ban toggle failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading Admin Powers...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>System Overview</h1>
      
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Users</h3>
          <p style={styles.cardValue}>{stats.totalUsers}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Servers</h3>
          <p style={styles.cardValue}>{stats.totalServers}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Online Servers</h3>
          <p style={styles.cardValue} className="text-success" style={{ color: 'var(--color-online)' }}>
            {stats.activeServers}
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3>User Management</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Joined Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {user.is_banned ? (
                      <span style={{ color: 'var(--color-critical)', fontWeight: 'bold' }}>BANNED</span>
                    ) : (
                      <span style={{ color: 'var(--color-online)' }}>ACTIVE</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button 
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      disabled={processingId === user.id}
                      style={{
                        ...styles.actionBtn,
                        background: user.is_banned ? 'rgba(255,255,255,0.1)' : 'var(--color-critical)'
                      }}
                    >
                      {processingId === user.id ? 'Processing...' : (user.is_banned ? 'Unban User' : 'Ban User')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
  },
  th: {
    padding: '16px',
    fontSize: '14px',
    color: '#888',
    fontWeight: 'normal',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
  },
  actionBtn: {
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  }
};
