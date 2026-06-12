'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Activity, Bell, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { user } = useAuth(false);
  return (
    <div className="min-h-screen bg-base text-textp font-sans relative overflow-hidden transition-colors duration-200">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8888882e_1px,transparent_1px),linear-gradient(to_bottom,#8888882e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 py-4 md:px-12 relative z-10 border-b border-borderg bg-base/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative rounded overflow-hidden">
            <Image src="/logo.png" alt="Neural Network Systems" fill className="object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight">Monitor-Baba</span>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <Link href="/dashboard" className="text-sm font-medium bg-accent text-base px-5 py-2.5 rounded-md hover:opacity-80 transition-opacity">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-texts hover:text-textp transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="text-sm font-medium bg-accent text-base px-4 py-2 rounded-md hover:opacity-80 transition-opacity">
                Deploy Now
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-borderg bg-card text-xs font-medium text-texts mb-8">
          <span className="w-2 h-2 rounded-full bg-online animate-pulse"></span>
          v1.0 is Live in Production
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Enterprise-Grade <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-textp to-texts">Infrastructure Monitoring</span>
        </h1>
        
        <p className="text-lg md:text-xl text-texts max-w-2xl mb-10 leading-relaxed">
          Maintain absolute visibility over your fleet with sub-second telemetry, strict threshold alerts, and beautiful professional dashboards.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {user ? (
            <Link href="/dashboard" className="px-8 py-3.5 rounded-md bg-accent text-base font-semibold hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/signup" className="px-8 py-3.5 rounded-md bg-accent text-base font-semibold hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
              Start Monitoring Free
            </Link>
          )}
          <Link href="#features" className="px-8 py-3.5 rounded-md border border-borderg bg-card hover:bg-hover transition-colors font-semibold flex items-center justify-center text-textp">
            Explore Documentation
          </Link>
        </div>

        {/* Feature Highlights */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full text-left">
          <div className="p-8 rounded-xl border border-borderg bg-card hover:shadow-md transition-shadow">
            <Activity size={24} className="text-textp mb-5" />
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Real-time Telemetry</h3>
            <p className="text-sm text-texts leading-relaxed">Sub-second granular updates for CPU, Memory, and Disk usage across all your Linux deployment nodes.</p>
          </div>
          <div className="p-8 rounded-xl border border-borderg bg-card hover:shadow-md transition-shadow">
            <Bell size={24} className="text-textp mb-5" />
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Strict Threshold Alerts</h3>
            <p className="text-sm text-texts leading-relaxed">Configure precise limits and receive instant push notifications or webhooks when systems become unstable.</p>
          </div>
          <div className="p-8 rounded-xl border border-borderg bg-card hover:shadow-md transition-shadow">
            <LayoutDashboard size={24} className="text-textp mb-5" />
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Executive Dashboards</h3>
            <p className="text-sm text-texts leading-relaxed">Visualize massive fleets with zero clutter. Monitor-Baba offers a sleek, minimal, professional interface.</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-10 text-xs text-textm border-t border-borderg mt-20 flex flex-col items-center gap-4">
        <div className="w-6 h-6 relative rounded opacity-50 grayscale">
          <Image src="/logo.png" alt="Neural Network Systems" fill className="object-cover" />
        </div>
        <p>© 2026 Monitor-Baba Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
