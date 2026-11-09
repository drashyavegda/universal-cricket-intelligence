/**
 * Authentication, authorisation and session management.
 *
 * Demo sessions use signed stateless tokens so they work across
 * Vercel serverless instances without relying on filesystem sessions.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getStore, update, newId, audit } from '../db/store';
import { hashPassword, verifyPassword, verifyTotp } from './crypto';
import type { Session, User } from '../types';

type SafeUser = Omit<User, 'passwordHash' | 'salt' | 'twoFactorSecret'>;

export type Permission =
  | 'data:upload'
  | 'data:edit'
  | 'data:approve'
  | 'analysis:run'
  | 'shortlist:write'
  | 'shortlist:approve'
  | 'report:write'
  | 'settings:ai'
  | 'settings:security'
  | 'admin:users'
  | 'view';

const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  owner: [
    'data:upload', 'data:edit', 'data:approve',
    'analysis:run', 'shortlist:write', 'shortlist:approve',
    'report:write', 'settings:ai', 'settings:security',
    'admin:users', 'view',
  ],
  analyst: [
    'data:upload', 'data:edit', 'analysis:run',
    'shortlist:write', 'shortlist:approve',
    'report:write', 'view',
  ],
  scout: [
    'analysis:run', 'shortlist:write',
    'report:write', 'view',
  ],
  viewer: ['view'],
};

export const can = (
  role: User['role'],
  permission: Permission
): boolean => ROLE_PERMISSIONS[role].includes(permission);

export const permissionsForRole = (
  role: User['role']
): Permission[] => ROLE_PERMISSIONS[role];

const MAX_FAILED = 5;
const LOCK_MINUTES = 10;

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limitPerMinute: number
): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  const windowStart = now - 60_000;

  const hits = (buckets.get(key) ?? []).filter(
    (time) => time > windowStart
  );

  if (hits.length >= limitPerMinute) {
    buckets.set(key, hits);

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(
        (hits[0] + 60_000 - now) / 1000
      ),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  return {
    allowed: true,
    remaining: limitPerMinute - hits.length,
    retryAfter: 0,
  };
}

const publicUser = (user: User): SafeUser => {
  const {
    passwordHash: _passwordHash,
    salt: _salt,
    twoFactorSecret: _twoFactorSecret,
    ...safeUser
  } = user;

  void _passwordHash;
  void _salt;
  void _twoFactorSecret;

  return safeUser;
};

function createSessionToken(
  userId: string,
  expiresAt: string
): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET is missing or invalid');
  }

  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt })
  ).toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function verifySessionToken(
  token: string
): { userId: string; expiresAt: string } | null {
  try {
    const secret = process.env.AUTH_SECRET;

    if (!secret || secret.length < 32) return null;

    const parts = token.split('.');

    if (parts.length !== 2) return null;

    const [payload, signature] = parts;

    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest();

    const actualSignature = Buffer.from(
      signature,
      'base64url'
    );

    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    if (
      typeof data.userId !== 'string' ||
      typeof data.expiresAt !== 'string'
    ) {
      return null;
    }

    const expiry = new Date(data.expiresAt).getTime();

    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      return null;
    }

    return {
      userId: data.userId,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  session?: Session;
  user?: SafeUser;
  requires2fa?: boolean;
  locked?: boolean;
}

export function login(
  email: string,
  password: string,
  totpCode?: string,
  meta: { ip?: string; userAgent?: string } = {}
): LoginResult {
  const store = getStore();

  const user = store.users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!user) {
    audit({
      actor: email,
      action: 'login_failed',
      entity: 'user',
      entityId: 'unknown',
      detail: 'No such account',
      ip: meta.ip,
    });

    return {
      ok: false,
      error: 'Invalid credentials',
    };
  }

  if (
    user.lockedUntil &&
    new Date(user.lockedUntil) > new Date()
  ) {
    return {
      ok: false,
      error: `Account locked until ${user.lockedUntil}. Try again later.`,
      locked: true,
    };
  }

  if (!verifyPassword(password, user.passwordHash, user.salt)) {
    update((s) => {
      const currentUser = s.users.find(
        (u) => u.id === user.id
      );

      if (!currentUser) return;

      currentUser.failedLogins += 1;

      if (currentUser.failedLogins >= MAX_FAILED) {
        currentUser.lockedUntil = new Date(
          Date.now() + LOCK_MINUTES * 60_000
        ).toISOString();
      }
    });

    audit({
      actor: email,
      action: 'login_failed',
      entity: 'user',
      entityId: user.id,
      detail: 'Bad password',
      ip: meta.ip,
    });

    return {
      ok: false,
      error: 'Invalid credentials',
    };
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totpCode) {
      return {
        ok: false,
        requires2fa: true,
        error: 'Two-factor code required',
      };
    }

    if (!verifyTotp(user.twoFactorSecret, totpCode)) {
      return {
        ok: false,
        requires2fa: true,
        error: 'Invalid two-factor code',
      };
    }
  }

  const createdAt = new Date().toISOString();

  const expiresAt = new Date(
    Date.now() +
      getStore().settings.security.sessionMinutes * 60_000
  ).toISOString();

  const token = createSessionToken(user.id, expiresAt);

  // Update the user without depending on update() returning a value.
  update((s) => {
    const currentUser = s.users.find(
      (u) => u.id === user.id
    );

    if (!currentUser) return;

    currentUser.lastLoginAt = createdAt;
    currentUser.failedLogins = 0;
    currentUser.lockedUntil = null;
  });

  // Fetch the updated user separately.
  const updatedUser =
    getStore().users.find((u) => u.id === user.id) ?? user;

  audit({
    actor: user.email,
    action: 'login',
    entity: 'user',
    entityId: user.id,
    detail: `Signed session issued, expires ${expiresAt}`,
    ip: meta.ip,
  });

  return {
    ok: true,
    session: {
      token,
      userId: user.id,
      createdAt,
      expiresAt,
      ip: meta.ip ?? 'local',
      userAgent: meta.userAgent ?? 'unknown',
    },
    user: publicUser(updatedUser),
  };
}

export function sessionUser(
  token: string | undefined | null
): SafeUser | null {
  if (!token) return null;

  const session = verifySessionToken(token);

  if (!session) return null;

  const user = getStore().users.find(
    (u) => u.id === session.userId
  );

  return user ? publicUser(user) : null;
}

export function logout(_token: string): void {
  // Logout API clears the session cookie.
}

export function register(
  email: string,
  password: string,
  name: string,
  role: User['role'] = 'analyst'
): {
  ok: boolean;
  error?: string;
  user?: SafeUser;
} {
  const settings = getStore().settings;

  if (
    password.length <
    settings.security.passwordMinLength
  ) {
    return {
      ok: false,
      error: `Password must be at least ${settings.security.passwordMinLength} characters`,
    };
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      error: 'Password must include an uppercase letter and a number',
    };
  }

  const store = getStore();

  if (
    store.users.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    )
  ) {
    return {
      ok: false,
      error: 'Email already registered',
    };
  }

  const { hash, salt } = hashPassword(password);

  const user: User = {
    id: newId('usr'),
    email: email.toLowerCase(),
    name,
    passwordHash: hash,
    salt,
    role,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    organisationId: 'org_demo',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedLogins: 0,
    lockedUntil: null,
  };

  update((s) => {
    s.users.push(user);
  });

  audit({
    actor: email,
    action: 'register',
    entity: 'user',
    entityId: user.id,
    detail: `Role ${role}`,
  });

  return {
    ok: true,
    user: publicUser(user),
  };
}

export function enable2fa(
  userId: string,
  secret: string
): void {
  update((s) => {
    const user = s.users.find((u) => u.id === userId);

    if (user) {
      user.twoFactorEnabled = true;
      user.twoFactorSecret = secret;
    }
  });

  audit({
    actor: userId,
    action: '2fa_enabled',
    entity: 'user',
    entityId: userId,
    detail: 'TOTP enrolment confirmed',
  });
}

export function disable2fa(userId: string): void {
  update((s) => {
    const user = s.users.find((u) => u.id === userId);

    if (user) {
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
    }
  });

  audit({
    actor: userId,
    action: '2fa_disabled',
    entity: 'user',
    entityId: userId,
    detail: 'TOTP removed',
  });
}

export function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const user = getStore().users.find(
    (u) => u.id === userId
  );

  if (!user) {
    return {
      ok: false,
      error: 'User not found',
    };
  }

  if (
    !verifyPassword(
      oldPassword,
      user.passwordHash,
      user.salt
    )
  ) {
    return {
      ok: false,
      error: 'Current password incorrect',
    };
  }

  if (
    newPassword.length <
    getStore().settings.security.passwordMinLength
  ) {
    return {
      ok: false,
      error: 'New password too short',
    };
  }

  const { hash, salt } = hashPassword(newPassword);

  update((s) => {
    const currentUser = s.users.find(
      (u) => u.id === userId
    );

    if (currentUser) {
      currentUser.passwordHash = hash;
      currentUser.salt = salt;
    }
  });

  audit({
    actor: user.email,
    action: 'password_changed',
    entity: 'user',
    entityId: userId,
    detail: 'Password rotated',
  });

  return { ok: true };
}

export { publicUser };