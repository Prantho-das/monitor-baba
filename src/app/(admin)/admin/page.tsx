'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldAlert, Users, Server, Activity, Ban, CheckCircle2 } from 'lucide-react';

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
      <div className="text-[15px] font-medium text-texts animate-pulse">
        Initialising Admin Environment...
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center gap-4 mb-8 border-b border-borderg pb-6">
        <h1 className="text-[22px] font-semibold text-textp flex items-center gap-2 tracking-tight">
          <ShieldAlert size={24} className="text-texts" /> Superadmin Command Center
        </h1>
        <span className="px-2.5 py-0.5 bg-critical/10 text-critical border border-critical/20 rounded text-[10px] font-bold tracking-wider uppercase">Live Access</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col gap-4 border-l-2 border-l-online">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] text-texts uppercase font-bold tracking-wider">Registered Users</h3>
            <Users size={18} className="text-texts" />
          </div>
          <p className="text-4xl font-bold text-textp tracking-tight">{stats.totalUsers}</p>
        </div>
        
        <div className="glass-card p-6 flex flex-col gap-4 border-l-2 border-l-textp">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] text-texts uppercase font-bold tracking-wider">Total Servers</h3>
            <Server size={18} className="text-texts" />
          </div>
          <p className="text-4xl font-bold text-textp tracking-tight">{stats.totalServers}</p>
        </div>
        
        <div className="glass-card p-6 flex flex-col gap-4 border-l-2 border-l-online">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] text-texts uppercase font-bold tracking-wider">Active Instances</h3>
            <Activity size={18} className="text-online" />
          </div>
          <p className="text-4xl font-bold text-online tracking-tight">
            {stats.activeServers}
          </p>
        </div>
      </div>
      
      <div className="glass-card mt-8 p-0 overflow-hidden border border-borderg">
        <div className="p-5 border-b border-borderg flex justify-between items-center bg-base">
          <h3 className="text-[15px] font-semibold text-textp tracking-tight">User Management</h3>
          <div className="text-[11px] font-medium text-texts px-3 py-1 bg-hover rounded-md border border-borderg">
            {users.length} Users Found
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-hover/50">
                <th className="p-4 text-[11px] text-texts uppercase tracking-wider font-bold">Identity</th>
                <th className="p-4 text-[11px] text-texts uppercase tracking-wider font-bold">Joined Date</th>
                <th className="p-4 text-[11px] text-texts uppercase tracking-wider font-bold">Account Status</th>
                <th className="p-4 text-[11px] text-texts uppercase tracking-wider font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderg bg-card">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-hover transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-hover border border-borderg flex items-center justify-center font-bold text-[13px] text-textp">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-[13px] text-textp">{user.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[13px] text-texts font-mono">
                    {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-4">
                    {user.is_banned ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-critical/10 text-critical border border-critical/20">
                        <Ban size={10} /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-online/10 text-online border border-online/20">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      disabled={processingId === user.id}
                      className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all border outline-none ${
                        user.is_banned 
                          ? 'bg-hover text-textp hover:bg-card border-borderg' 
                          : 'bg-critical/10 text-critical hover:bg-critical/20 border-critical/20'
                      } ${processingId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {processingId === user.id ? 'Processing...' : (user.is_banned ? 'Unban User' : 'Ban User')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-textm text-[13px]">
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
