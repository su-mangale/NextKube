import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { UserSession } from './jwt';

export interface StoredUser {
  username: string;
  hash: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
  createdAt?: string;
}

export type SanitizedUser = Omit<StoredUser, 'hash'>;

// Persistent User Store Configuration
const STORE_DIR = path.join(process.cwd(), '.nextkube');
const USERS_FILE = path.join(STORE_DIR, 'users.json');

function ensureStoreDir(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[NextKube Auth] Could not ensure store directory:', err);
  }
}

/**
 * Reads persistent users from .nextkube/users.json.
 * If file does not exist, seeds it with initial default admin.
 */
export function readStoredUsers(): StoredUser[] {
  ensureStoreDir();
  const defaultUsername = process.env.NEXTKUBE_ADMIN_USER || 'admin';
  const defaultPassword = process.env.NEXTKUBE_ADMIN_PASSWORD || 'admin123';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(defaultPassword, salt);
  const fallbackAdmin: StoredUser = {
    username: defaultUsername,
    hash,
    role: 'admin',
    displayName: 'Cluster Administrator',
    createdAt: new Date().toISOString(),
  };

  try {
    if (!fs.existsSync(USERS_FILE)) {
      try {
        fs.writeFileSync(USERS_FILE, JSON.stringify([fallbackAdmin], null, 2), 'utf-8');
      } catch (err) {
        console.warn('[NextKube Auth] Failed to write initial users.json to disk (filesystem may be read-only):', err);
      }
      return [fallbackAdmin];
    }

    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [fallbackAdmin];
  } catch (err) {
    console.warn('[NextKube Auth] Error reading users.json from disk, falling back to in-memory admin:', err);
    return [fallbackAdmin];
  }
}

/**
 * Writes users list back to .nextkube/users.json.
 */
export function writeStoredUsers(users: StoredUser[]): void {
  try {
    ensureStoreDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[NextKube Auth] Error writing users.json to disk:', err);
  }
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
 * Retrieves all registered users as a Map keyed by lowercase username.
 */
export function getUserStore(): Map<string, StoredUser> {
  const users = new Map<string, StoredUser>();
  const stored = readStoredUsers();
  for (const u of stored) {
    users.set(u.username.toLowerCase(), u);
  }
  return users;
}

/**
 * Returns all users without exposing their password hashes.
 */
export function getAllUsersSanitized(): SanitizedUser[] {
  const stored = readStoredUsers();
  return stored.map((u) => ({
    username: u.username,
    role: u.role,
    displayName: u.displayName || u.username,
    createdAt: u.createdAt || 'Initial setup',
  }));
}

/**
 * Changes a user's password after verifying their current password.
 */
export async function changeUserPassword(
  username: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPasswordInput || newPasswordInput.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const stored = readStoredUsers();
  const index = stored.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());

  if (index === -1) {
    return { success: false, error: 'User account not found.' };
  }

  const user = stored[index];
  let matches = false;

  if (user.hash.startsWith('$2a$') || user.hash.startsWith('$2b$') || user.hash.startsWith('$2y$')) {
    matches = bcrypt.compareSync(currentPasswordInput, user.hash);
  } else {
    matches = currentPasswordInput === user.hash;
  }

  if (!matches) {
    return { success: false, error: 'Current password does not match.' };
  }

  // Hash new password with bcrypt (cost 10)
  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPasswordInput, salt);

  stored[index] = {
    ...user,
    hash: newHash,
  };

  writeStoredUsers(stored);
  return { success: true };
}

/**
 * Creates a new user in the persistent store.
 */
export async function createNewUser(payload: {
  username: string;
  password: string;
  role: 'admin' | 'operator' | 'viewer';
  displayName?: string;
}): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const username = payload.username.trim();
  const password = payload.password;
  const role = payload.role || 'operator';
  const displayName = payload.displayName?.trim() || username;

  if (!username || username.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return { success: false, error: 'Username may only contain letters, numbers, hyphens, periods, or underscores.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const stored = readStoredUsers();
  const exists = stored.some((u) => u.username.toLowerCase() === username.toLowerCase());

  if (exists) {
    return { success: false, error: `User "${username}" already exists.` };
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const newUser: StoredUser = {
    username,
    hash,
    role,
    displayName,
    createdAt: new Date().toISOString(),
  };

  stored.push(newUser);
  writeStoredUsers(stored);

  return {
    success: true,
    user: {
      username: newUser.username,
      role: newUser.role,
      displayName: newUser.displayName,
      createdAt: newUser.createdAt,
    },
  };
}

/**
 * Updates a user's credentials (displayName, role, password).
 */
export async function updateUserCredentials(
  targetUsername: string,
  payload: {
    displayName?: string;
    role?: 'admin' | 'operator' | 'viewer';
    password?: string;
  },
  requestingUser?: { username: string; role: string }
): Promise<{ success: boolean; user?: SanitizedUser; error?: string }> {
  const stored = readStoredUsers();
  const index = stored.findIndex((u) => u.username.toLowerCase() === targetUsername.toLowerCase());

  if (index === -1) {
    return { success: false, error: 'User not found.' };
  }

  const user = stored[index];

  // Role modification rules
  if (payload.role && payload.role !== user.role) {
    if (requestingUser && requestingUser.role !== 'admin') {
      return { success: false, error: 'Only administrators can change user roles.' };
    }
    if (user.role === 'admin' && payload.role !== 'admin') {
      const adminCount = stored.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot demote the only remaining administrator.' };
      }
    }
    user.role = payload.role;
  }

  if (payload.displayName !== undefined) {
    user.displayName = payload.displayName.trim() || user.username;
  }

  if (payload.password && payload.password.trim().length > 0) {
    if (payload.password.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    const salt = bcrypt.genSaltSync(10);
    user.hash = bcrypt.hashSync(payload.password, salt);
  }

  stored[index] = user;
  writeStoredUsers(stored);

  return {
    success: true,
    user: {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Deletes a user by username.
 */
export async function deleteUser(
  targetUsername: string,
  requestingUsername: string
): Promise<{ success: boolean; error?: string }> {
  if (targetUsername.toLowerCase() === requestingUsername.toLowerCase()) {
    return { success: false, error: 'You cannot delete your own active account.' };
  }

  const stored = readStoredUsers();
  const target = stored.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());

  if (!target) {
    return { success: false, error: 'User not found.' };
  }

  // Prevent deleting the last admin
  if (target.role === 'admin') {
    const adminCount = stored.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot delete the only remaining administrator account.' };
    }
  }

  const filtered = stored.filter((u) => u.username.toLowerCase() !== targetUsername.toLowerCase());
  writeStoredUsers(filtered);

  return { success: true };
}

/**
 * Authenticates user credentials with support for Bcrypt hashes and safe fallback.
 */
export async function authenticateCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const users = getUserStore();
  const user = users.get(usernameInput.trim().toLowerCase());

  if (!user) {
    return { success: false, error: 'Invalid username or password.' };
  }

  let matches = false;

  // Check if hash is a valid bcrypt format
  if (user.hash.startsWith('$2a$') || user.hash.startsWith('$2b$') || user.hash.startsWith('$2y$')) {
    matches = bcrypt.compareSync(passwordInput, user.hash);
  } else {
    // If plaintext was configured directly
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
