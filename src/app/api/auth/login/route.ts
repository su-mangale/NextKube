import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateCredentials,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '@/server/auth';
import { createSessionToken, AUTH_COOKIE_NAME } from '@/server/jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    // Resolve client identifier for rate-limiting (IP + username)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';
    const rateLimitKey = `${ip}:${username.trim()}`;

    // Check rate limit
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Account locked. Please try again in ${rateCheck.retryAfter} seconds.`,
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Authenticate credentials against htpasswd / user store
    const authResult = await authenticateCredentials(username, password);

    if (!authResult.success || !authResult.user) {
      const lockResult = recordFailedAttempt(rateLimitKey);
      if (lockResult.locked) {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Account locked for 15 minutes.`,
            retryAfter: lockResult.retryAfter,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: authResult.error || 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Successful login: reset rate limiter
    resetRateLimit(rateLimitKey);

    // Create signed JWT session
    const token = await createSessionToken(authResult.user);

    // Build response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
    });

    // Detect if connection is HTTPS or behind SSL termination.
    // Plain HTTP access (e.g. http://10.21.10.222) MUST NOT set secure: true,
    // otherwise browsers will drop the cookie.
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const isHttps = req.nextUrl.protocol === 'https:' || forwardedProto === 'https';
    const isLocalhost =
      req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    const isSecure = isHttps && !isLocalhost;

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error: any) {
    console.error('[NextKube Auth API] Login Error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || 'Internal authentication server error.' },
      { status: 500 }
    );
  }
}
