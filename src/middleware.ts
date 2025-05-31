import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next();
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

  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
  ],
};