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
    menuItems.push({ name: 'Admin', path: '/admin', icon: <ShieldAlert size={18} /> });
  }

  return (
    <aside className="fixed bottom-0 md:top-0 left-0 w-full md:w-64 h-[65px] md:h-screen bg-card border-t md:border-t-0 md:border-r border-borderg flex flex-row md:flex-col z-[100] transition-colors duration-200">
      <div className="hidden md:flex p-6 items-center gap-3 border-b border-borderg h-[70px] flex-shrink-0">
        <div className="w-8 h-8 relative rounded overflow-hidden shadow-sm border border-borderg bg-hover flex-shrink-0">
          <Image src="/logo.png" alt="Logo" fill className="object-cover" />
        </div>
        <span className="font-semibold text-[16px] text-textp tracking-tight truncate">Monitor-Baba</span>
      </div>

      <nav className="flex-1 px-1 md:px-4 py-1.5 md:py-6 flex flex-row md:flex-col justify-around md:justify-start items-center md:items-stretch gap-1 overflow-x-auto md:overflow-y-auto hide-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-2 md:px-3 py-1.5 md:py-2.5 rounded-md transition-colors duration-200 min-w-[60px] md:min-w-0 ${
                isActive 
                  ? 'text-textp font-semibold md:bg-hover' 
                  : 'text-texts hover:text-textp hover:bg-hover'
              }`}
            >
              <span className={isActive ? 'text-textp' : 'text-textm'}>{item.icon}</span>
              <span className="text-[10px] md:text-[13px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
        <button 
          onClick={signOut} 
          className="md:hidden flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-md text-texts hover:text-textp hover:bg-hover transition-colors min-w-[60px]"
        >
          <LogOut size={18} className="text-textm" />
          <span className="text-[10px] tracking-tight">Log Out</span>
        </button>
      </nav>

      <div className="hidden md:block p-4 border-t border-borderg flex-shrink-0">
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
