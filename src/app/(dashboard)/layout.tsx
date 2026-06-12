'use client';

import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard dashboard routes (require user session)
  const { loading, user } = useAuth(true);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-[15px] font-medium text-texts animate-pulse">
          Initialising Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base text-textp">
      <Sidebar />
      <main className="flex-1 md:ml-64 mb-16 md:mb-0 min-h-screen relative overflow-x-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
