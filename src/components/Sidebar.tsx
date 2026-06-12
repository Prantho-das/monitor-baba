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
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Monitor Baba Logo" className="sidebar-logo" />
        <span className="sidebar-brand-text">Monitor-Baba</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.name}</span>
              {isActive && <div className="sidebar-active-indicator" />}
            </Link>
          );
        })}
        {/* Mobile-only sign out link within nav */}
        <button onClick={signOut} className="sidebar-nav-item mobile-signout">
          <span className="sidebar-icon">🚪</span>
          <span className="sidebar-label">Sign Out</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button onClick={signOut} className="sidebar-logout-btn">
          <span className="sidebar-icon">🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
