import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';

// Public endpoints that never require authentication
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static assets, Next internal files, and favicon/icon assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/icon.svg' ||
    pathname === '/favicon.ico' ||
    (pathname.includes('.') && !pathname.endsWith('.html'))
  ) {
    return NextResponse.next();
  }

  // 2. Extract and verify session token from HTTP-only cookie
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // 3. Handle /login page:
  // - If already authenticated, redirect to /clusters (or callbackUrl)
  // - If unauthenticated, allow viewing login page
  if (pathname === '/login') {
    if (user) {
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/clusters';
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }
    return NextResponse.next();
  }

  // 4. Public auth API routes
  if (PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // 5. If not authenticated:
  if (!user) {
    // For API calls, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to NextKube.' },
        { status: 401 }
      );
    }

    // For web pages, redirect to /login with target callbackUrl
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Authenticated: Attach user identity headers for downstream handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-name', user.username);
  requestHeaders.set('x-user-role', user.role);
  if (user.displayName) {
    requestHeaders.set('x-user-display-name', user.displayName);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
