import { SignJWT, jwtVerify } from 'jose';

export interface UserSession {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
  email?: string;
}

export const AUTH_COOKIE_NAME = 'nextkube_session';

// 32-character secret key for HMAC-SHA256
const DEFAULT_SECRET = 'nextkube-super-secure-jwt-auth-secret-32chars!';
const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTKUBE_AUTH_SECRET || DEFAULT_SECRET
);

/**
 * Creates a signed JWT session token valid for 12 hours.
 */
export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    email: user.email || '',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT session token and returns the payload.
 * Fully compatible with Edge Runtime (Web Crypto API).
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      username: payload.username as string,
      role: (payload.role as 'admin' | 'operator' | 'viewer') || 'viewer',
      displayName: payload.displayName as string | undefined,
      email: payload.email as string | undefined,
    };
  } catch {
    return null;
  }
}
