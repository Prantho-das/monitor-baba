'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Bell, Sun, Moon, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  servers?: { name: string } | null;
}

export default function TopBar({ title }: { title: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadAlerts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const token = session.access_token;
    try {
      const res = await fetch('/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAlerts(data.filter((a: Alert) => !a.is_read));
      }
    } catch (err) {
      console.error('Failed to load topbar alerts:', err);
    }
  };

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    fetchUnreadAlerts();

    // Listen for real-time insert of new alerts
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('Realtime alert received:', payload.new);
          fetchUnreadAlerts();
        }
      )
      .subscribe();

    // Handle clicks outside of notification dropdown
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ all: true }),
      });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to mark alerts read:', err);
    }
  };

  return (
    <header className="h-[70px] flex items-center justify-between px-8 border-b border-borderg sticky top-0 bg-base z-50 transition-colors duration-200">
      <h2 className="text-[15px] font-semibold text-textp">{title}</h2>

      <div className="flex items-center gap-4" ref={dropdownRef}>
        <button
          onClick={toggleTheme}
          className="text-texts hover:text-textp p-2 rounded-md hover:bg-hover transition-colors flex items-center outline-none"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="text-texts hover:text-textp p-2 rounded-md hover:bg-hover transition-colors flex items-center relative outline-none"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-critical ring-2 ring-base"></span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-80 pt-2 pb-0 bg-card border border-borderg rounded-lg shadow-md animate-[fadeIn_0.15s_ease-out] overflow-hidden z-50">
              <div className="flex justify-between items-center px-4 pb-2 border-b border-borderg">
                <span className="font-semibold text-[13px] text-textp">Alerts</span>
                {alerts.length > 0 && (
                  <button onClick={markAllRead} className="text-texts text-[11px] font-medium hover:text-textp transition-colors outline-none">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-texts text-[13px]">No unread alerts</div>
                ) : (
                  alerts.slice(0, 5).map((alert) => (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setDropdownOpen(false)}
                      className="flex flex-col p-3 border-b border-borderg hover:bg-hover transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle size={14} className="text-critical" />
                        <span className="text-[11px] font-semibold text-textp uppercase tracking-wider">
                          {alert.servers?.name || 'Server'}
                        </span>
                      </div>
                      <p className="text-[13px] text-texts leading-relaxed group-hover:text-textp transition-colors">{alert.message}</p>
                      <span className="text-[10px] text-textm mt-2">
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              <div className="p-2 text-center border-t border-borderg bg-hover/50">
                <Link
                  href="/alerts"
                  onClick={() => setDropdownOpen(false)}
                  className="text-[12px] text-texts font-medium hover:text-textp transition-colors"
                >
                  View All Alerts
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
