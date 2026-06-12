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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ fontSize: '18px', color: 'var(--accent-cyan)', animation: 'pulse-glow 1.5s infinite ease-in-out' }}>
        Loading Admin Powers...
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ padding: '0', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Superadmin Command Center
        </h1>
        <span style={{ padding: '4px 12px', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(96, 165, 250, 0.2)' }}>LIVE</span>
      </div>
      
      <div style={styles.grid}>
        <div className="glass-card" style={{ ...styles.card, borderTop: '4px solid #60a5fa' }}>
          <h3 style={styles.cardTitle}>Total Users</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <p style={styles.cardValue}>{stats.totalUsers}</p>
            <span style={{ color: '#60a5fa', fontSize: '14px', marginBottom: '6px' }}>Registered</span>
          </div>
        </div>
        <div className="glass-card" style={{ ...styles.card, borderTop: '4px solid #a78bfa' }}>
          <h3 style={styles.cardTitle}>Total Servers</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <p style={styles.cardValue}>{stats.totalServers}</p>
            <span style={{ color: '#a78bfa', fontSize: '14px', marginBottom: '6px' }}>Monitored</span>
          </div>
        </div>
        <div className="glass-card" style={{ ...styles.card, borderTop: '4px solid var(--color-online)' }}>
          <h3 style={styles.cardTitle}>Online Servers</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <p className="text-success" style={{ ...styles.cardValue, color: 'var(--color-online)' }}>
              {stats.activeServers}
            </p>
            <span style={{ color: 'var(--color-online)', fontSize: '14px', marginBottom: '6px' }}>Active Now</span>
          </div>
        </div>
      </div>
      
      <div className="glass-card" style={{ marginTop: '40px', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>User Management</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{users.length} Users Found</div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={styles.th}>Email Address</th>
                <th style={styles.th}>Joined Date</th>
                <th style={styles.th}>Account Status</th>
                <th style={styles.th} align="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '500' }}>{user.email}</span>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td style={styles.td}>
                    {user.is_banned ? (
                      <span style={{ color: 'var(--color-critical)', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>BANNED</span>
                    ) : (
                      <span style={{ color: 'var(--color-online)', fontWeight: '500', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>ACTIVE</span>
                    )}
                  </td>
                  <td style={styles.td} align="right">
                    <button 
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      disabled={processingId === user.id}
                      style={{
                        ...styles.actionBtn,
                        background: user.is_banned ? 'rgba(255,255,255,0.1)' : 'var(--color-critical)',
                        opacity: processingId === user.id ? 0.5 : 1
                      }}
                    >
                      {processingId === user.id ? 'Processing...' : (user.is_banned ? 'Unban User' : 'Ban User')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found in the system.
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    fontWeight: '600',
    letterSpacing: '1px',
    marginBottom: '16px',
  },
  cardValue: {
    fontSize: '42px',
    fontWeight: '800',
    lineHeight: '1',
  },
  th: {
    padding: '16px 24px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
  },
  actionBtn: {
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }
};
