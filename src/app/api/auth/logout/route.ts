import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/server/jwt';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  const forwardedProto = req.headers.get('x-forwarded-proto');
  const isHttps = req.nextUrl.protocol === 'https:' || forwardedProto === 'https';
  const isLocalhost =
    req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
  const isSecure = isHttps && !isLocalhost;

  // Expire session cookie
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
