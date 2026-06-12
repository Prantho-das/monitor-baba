'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Server, Bell, Settings, ShieldAlert, LogOut } from 'lucide-react';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Servers', path: '/servers', icon: <Server size={18} /> },
    { name: 'Alerts', path: '/alerts', icon: <Bell size={18} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
  ];

  if (user?.app_metadata?.is_super_admin === true) {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: <ShieldAlert size={18} /> });
  }

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-card border-r border-borderg flex flex-col z-[100] transition-colors duration-200">
      <div className="p-6 flex items-center gap-3 border-b border-borderg h-[70px]">
        <div className="w-8 h-8 relative rounded overflow-hidden shadow-sm border border-borderg bg-hover flex-shrink-0">
          <Image src="/logo.png" alt="Logo" fill className="object-cover" />
        </div>
        <span className="font-semibold text-[16px] text-textp tracking-tight truncate">Monitor-Baba</span>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors duration-200 ${
                isActive 
                  ? 'bg-hover text-textp font-semibold' 
                  : 'text-texts hover:text-textp hover:bg-hover'
              }`}
            >
              <span className={isActive ? 'text-textp' : 'text-textm'}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
        <button 
          onClick={signOut} 
          className="lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium text-texts hover:text-textp hover:bg-hover transition-colors mt-1"
        >
          <LogOut size={18} className="text-textm" />
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="p-4 border-t border-borderg">
        <button 
          onClick={signOut} 
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium text-texts hover:text-textp hover:bg-hover transition-colors"
        >
          <LogOut size={18} className="text-textm" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
