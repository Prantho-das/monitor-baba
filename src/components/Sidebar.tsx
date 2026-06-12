'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Servers', path: '/servers', icon: '🖥️' },
    { name: 'Alerts', path: '/alerts', icon: '🔔' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  if (user?.app_metadata?.is_super_admin === true) {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: '👑' });
  }

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-sidebar border-r border-hover flex flex-col z-[100] transition-all duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-hover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Monitor Baba Logo" className="w-9 h-9 rounded-lg shadow-sm" />
        <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-accent bg-clip-text text-transparent tracking-tight">Monitor-Baba</span>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-hover text-white shadow-sm' : 'text-textm hover:bg-card hover:text-textp'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
              {isActive && <div className="absolute left-0 top-1/4 h-1/2 w-1 bg-accent rounded-r-md" />}
            </Link>
          );
        })}
        <button onClick={signOut} className="flex lg:hidden items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <span className="text-lg">🚪</span>
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="p-4 border-t border-hover">
        <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200">
          <span className="text-lg">🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
