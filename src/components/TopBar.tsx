'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

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
    <header className="h-[70px] flex items-center justify-between px-10 border-b border-borderg sticky top-0 bg-sidebar/80 backdrop-blur-md z-50 transition-colors duration-300">
      <h2 className="text-xl font-semibold text-textp">{title}</h2>

      <div className="flex items-center gap-5" ref={dropdownRef}>
        <button
          onClick={toggleTheme}
          className="bg-transparent border-none text-xl cursor-pointer text-textp p-2 rounded-lg hover:bg-hover transition-colors flex items-center"
          title="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-transparent border-none text-xl cursor-pointer text-textp p-2 rounded-lg hover:bg-hover transition-colors flex items-center relative"
          >
            <span>🔔</span>
            {alerts.length > 0 && (
              <span className="absolute top-0 right-0 bg-critical text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center shadow-sm">
                {alerts.length}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-80 pt-4 pb-0 bg-card border border-borderg rounded-xl shadow-glass animate-[fadeIn_0.2s_ease-out] overflow-hidden z-50">
              <div className="flex justify-between items-center px-4 pb-3 border-b border-borderg">
                <span className="font-semibold text-sm text-textp">Alerts</span>
                {alerts.length > 0 && (
                  <button onClick={markAllRead} className="bg-transparent border-none text-accent text-xs cursor-pointer font-medium hover:text-blue-500">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[280px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-texts text-sm">No unread alerts</div>
                ) : (
                  alerts.slice(0, 5).map((alert) => (
                    <Link
                      key={alert.id}
                      href="/alerts"
                      onClick={() => setDropdownOpen(false)}
                      className="flex flex-col p-3 border-b border-borderg hover:bg-hover transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-critical shadow-neon" />
                        <span className="text-[11px] font-bold text-textp uppercase">
                          {alert.servers?.name || 'Server'}
                        </span>
                      </div>
                      <p className="text-[13px] text-texts leading-relaxed">{alert.message}</p>
                      <span className="text-[10px] text-textm mt-1 self-end">
                        {new Date(alert.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              <div className="p-3 text-center border-t border-borderg bg-muted">
                <Link
                  href="/alerts"
                  onClick={() => setDropdownOpen(false)}
                  className="text-[13px] text-textp font-medium hover:text-accent transition-colors"
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
