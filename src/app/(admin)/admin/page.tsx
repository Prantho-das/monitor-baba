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

      const { count: serversCount } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true });
        
      const { count: activeCount } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

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
    <div className="flex justify-center items-center h-[60vh]">
      <div className="text-lg text-emerald-500 animate-[pulse-glow_1.5s_infinite_ease-in-out]">
        Loading Admin Powers...
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-accent bg-clip-text text-transparent">
          Superadmin Command Center
        </h1>
        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold tracking-wider">LIVE</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card border-t-4 border-t-blue-400">
          <h3 className="text-xs text-textm uppercase font-semibold tracking-wider mb-4">Total Users</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-extrabold leading-none">{stats.totalUsers}</p>
            <span className="text-blue-400 text-sm mb-1">Registered</span>
          </div>
        </div>
        <div className="glass-card border-t-4 border-t-accent">
          <h3 className="text-xs text-textm uppercase font-semibold tracking-wider mb-4">Total Servers</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-extrabold leading-none">{stats.totalServers}</p>
            <span className="text-accent text-sm mb-1">Monitored</span>
          </div>
        </div>
        <div className="glass-card border-t-4 border-t-emerald-500">
          <h3 className="text-xs text-textm uppercase font-semibold tracking-wider mb-4">Online Servers</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-extrabold leading-none text-emerald-500">
              {stats.activeServers}
            </p>
            <span className="text-emerald-500 text-sm mb-1">Active Now</span>
          </div>
        </div>
      </div>
      
      <div className="glass-card mt-10 p-0 overflow-hidden">
        <div className="p-6 border-b border-hover flex justify-between items-center bg-card">
          <h3 className="text-lg font-semibold">User Management</h3>
          <div className="text-sm text-textm px-3 py-1 bg-hover rounded-full">{users.length} Users Found</div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base/50">
                <th className="p-4 text-xs text-textm uppercase tracking-wider font-semibold">Email Address</th>
                <th className="p-4 text-xs text-textm uppercase tracking-wider font-semibold">Joined Date</th>
                <th className="p-4 text-xs text-textm uppercase tracking-wider font-semibold">Account Status</th>
                <th className="p-4 text-xs text-textm uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hover">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-hover/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-accent flex items-center justify-center font-bold text-sm shadow-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{user.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-textm">
                    {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-4">
                    {user.is_banned ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">BANNED</span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      disabled={processingId === user.id}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                        user.is_banned 
                          ? 'bg-hover text-white hover:bg-card border border-hover' 
                          : 'bg-red-500/90 text-white hover:bg-red-600'
                      } ${processingId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {processingId === user.id ? 'Processing...' : (user.is_banned ? 'Unban User' : 'Ban User')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-textm">
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
