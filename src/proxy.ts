import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { createServerClient } from '@/lib/supabase/server';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // Initialize Supabase Server Client
  const supabase = createServerClient();

  // Get current user session
  const { data: { session } } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  // Paths requiring authentication
  const isProtectedPath = 
    path.startsWith('/dashboard') || 
    path.startsWith('/servers') || 
    path.startsWith('/alerts') || 
    path.startsWith('/settings');

  // Paths that are only for unauthenticated users (login/signup)
  const isAuthPath = path.startsWith('/login') || path.startsWith('/signup');

  if (isProtectedPath && !session) {
    // Redirect to login if user tries to access dashboard when unauthenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPath && session) {
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
