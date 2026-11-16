import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { UserSession } from './jwt';

export interface StoredUser {
  username: string;
  hash: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
}

// In-Memory Rate Limiting Tracker
interface RateLimitRecord {
  count: number;
  lockedUntil: number;
}

const failedAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check whether an IP/username is currently rate-limited.
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const record = failedAttempts.get(key);
  const now = Date.now();

  if (record && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Record a failed authentication attempt.
 */
export function recordFailedAttempt(key: string): { locked: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(key, record);
    return { locked: true, retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  failedAttempts.set(key, record);
  return { locked: false };
}

/**
 * Reset rate limit count on successful login.
 */
export function resetRateLimit(key: string) {
  failedAttempts.delete(key);
}

/**
 * Parses an htpasswd-formatted string into StoredUser entries.
 * Supports lines in formats:
 * - username:bcrypt_hash
 * - username:bcrypt_hash:role
 * - username:bcrypt_hash:role:displayName
 */
export function parseHtpasswdContent(content: string): Map<string, StoredUser> {
  const users = new Map<string, StoredUser>();
  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(':');
    if (parts.length >= 2) {
      const username = parts[0].trim();
      const hash = parts[1].trim();
      const rawRole = parts[2]?.trim().toLowerCase();
      const role: 'admin' | 'operator' | 'viewer' =
        rawRole === 'admin' || rawRole === 'operator' || rawRole === 'viewer'
          ? rawRole
          : 'operator';
      const displayName = parts[3]?.trim();

      if (username && hash) {
        users.set(username, { username, hash, role, displayName });
      }
    }
  }

  return users;
}

/**
 * Retrieves all registered users from htpasswd file, environment variables, or default bootstrap.
 */
export function getUserStore(): Map<string, StoredUser> {
  const users = new Map<string, StoredUser>();

  // 1. Try htpasswd file if specified or present at standard locations
  const customPath = process.env.NEXTKUBE_HTPASSWD_PATH;
  const standardPaths = [
    customPath,
    path.join(process.cwd(), '.htpasswd'),
    path.join(process.cwd(), 'htpasswd'),
    '/etc/nextkube/htpasswd',
  ].filter(Boolean) as string[];

  for (const filePath of standardPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseHtpasswdContent(fileContent);
        parsed.forEach((user, key) => users.set(key, user));
        break; // Found and parsed valid htpasswd
      }
    } catch (err) {
      console.warn(`[NextKube Auth] Failed to read htpasswd file at ${filePath}:`, err);
    }
  }

  // 2. Try NEXTKUBE_USERS environment variable (comma-separated entries)
  // Example: "admin:$2a$10$abc...:admin,dev:$2a$10$def...:operator"
  const envUsers = process.env.NEXTKUBE_USERS;
  if (envUsers) {
    const envEntries = envUsers.split(',');
    for (const entry of envEntries) {
      const parts = entry.trim().split(':');
      if (parts.length >= 2) {
        const username = parts[0].trim();
        const hash = parts[1].trim();
        const rawRole = parts[2]?.trim().toLowerCase();
        const role: 'admin' | 'operator' | 'viewer' =
          rawRole === 'admin' || rawRole === 'operator' || rawRole === 'viewer'
            ? rawRole
            : 'operator';

        if (username && hash) {
          users.set(username, { username, hash, role });
        }
      }
    }
  }

  // 3. Fallback: Default Bootstrap Admin
  // If no user was configured, provide the default admin/admin123 for initial setup
  if (users.size === 0) {
    const defaultUsername = process.env.NEXTKUBE_ADMIN_USER || 'admin';
    const defaultPassword = process.env.NEXTKUBE_ADMIN_PASSWORD || 'admin123';
    // Generate bcrypt hash for default admin password (cost 10)
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    users.set(defaultUsername, {
      username: defaultUsername,
      hash,
      role: 'admin',
      displayName: 'Cluster Administrator',
    });
  }

  return users;
}

/**
 * Authenticates user credentials with support for Bcrypt hashes and safe fallback.
 */
export async function authenticateCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const users = getUserStore();
  const user = users.get(usernameInput.trim());

  if (!user) {
    return { success: false, error: 'Invalid username or password.' };
  }

  let matches = false;

  // Check if hash is a valid bcrypt format
  if (user.hash.startsWith('$2a$') || user.hash.startsWith('$2b$') || user.hash.startsWith('$2y$')) {
    matches = bcrypt.compareSync(passwordInput, user.hash);
  } else {
    // If plaintext was configured directly in env
    matches = passwordInput === user.hash;
  }

  if (!matches) {
    return { success: false, error: 'Invalid username or password.' };
  }

  return {
    success: true,
    user: {
      username: user.username,
      role: user.role,
      displayName: user.displayName || user.username,
    },
  };
}
