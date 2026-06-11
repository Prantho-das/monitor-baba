'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Servers', path: '/servers', icon: '🖥️' },
    { name: 'Alerts', path: '/alerts', icon: '🔔' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mooonitooor Logo" style={styles.logo} />
        <span style={styles.brandText}>Mooonitooor</span>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span>{item.name}</span>
              {isActive && <div style={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>

      <div style={styles.footer}>
        <button onClick={signOut} style={styles.logoutBtn}>
          <span style={styles.icon}>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-glass)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 100,
  },
  brand: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-glass)',
  },
  logo: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
  },
  brandText: {
    fontWeight: '700',
    fontSize: '18px',
    background: 'linear-gradient(to right, #00f2fe, #8e2de2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  nav: {
    flex: 1,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-primary)',
  },
  activeIndicator: {
    position: 'absolute' as const,
    left: '0',
    top: '25%',
    height: '50%',
    width: '4px',
    background: 'var(--accent-cyan)',
    borderRadius: '0 4px 4px 0',
    boxShadow: 'var(--glow-cyan)',
  },
  icon: {
    fontSize: '18px',
  },
  footer: {
    padding: '24px 16px',
    borderTop: '1px solid var(--border-glass)',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'transparent',
    border: 'none',
    color: '#ff4b2b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.2s ease',
  },
};
