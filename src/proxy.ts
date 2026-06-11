import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // Check if there is a supabase auth token in cookies
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  const path = request.nextUrl.pathname;

  // Paths requiring authentication
  const isProtectedPath = 
    path.startsWith('/dashboard') || 
    path.startsWith('/servers') || 
    path.startsWith('/alerts') || 
    path.startsWith('/settings');

  // Paths that are only for unauthenticated users (login/signup)
  const isAuthPath = path.startsWith('/login') || path.startsWith('/signup');

  if (isProtectedPath && !hasAuthCookie) {
    // Redirect to login if user tries to access dashboard when unauthenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPath && hasAuthCookie) {
    // Redirect to dashboard if authenticated user tries to open login/signup
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png, manifest.json, firebase-messaging-sw.js (PWA assets)
     * - api/agent/report, api/agent/install (Agent API endpoints, they need to be public)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json|firebase-messaging-sw.js|api/agent/report|api/agent/install).*)',
  ],
};
