import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next();
  
  // AUTHENTICATION BYPASS FOR TESTING AI FEATURES
  // This code bypasses all authentication checks temporarily
  // WARNING: This should be removed when authentication is re-enabled
  
  // Redirect /login or /signup to /dashboard directly for now
  const isLoginPage = req.nextUrl.pathname === '/login' || 
                     req.nextUrl.pathname === '/signup';
  
  if (isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return res;
  
  // Original authentication code (commented out for now)
  /*
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired & still valid in Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Authentication check for protected routes
  const isAuthRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                     req.nextUrl.pathname.startsWith('/upload') ||
                     req.nextUrl.pathname.startsWith('/admin');
  
  // Auth pages that should redirect to dashboard if already logged in
  const isLoginPage = req.nextUrl.pathname === '/login' || 
                     req.nextUrl.pathname === '/signup';

  // If accessing a protected route without being logged in, redirect to login
  if (isAuthRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing login/signup pages while logged in, redirect to dashboard
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  */

  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Keep the login/signup redirects for now
    '/login',
    '/signup',
    // Other routes no longer need auth checks during testing
    // but keeping them in the matcher to easily restore later
    '/dashboard/:path*',
    '/upload/:path*',
    '/admin/:path*',
  ],
};