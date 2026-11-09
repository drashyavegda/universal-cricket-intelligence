/**
 * Authentication, authorisation and session management (Feature 30).
 *
 * Demo mode uses signed opaque session tokens stored server-side. Set AUTH_MODE
 * to "oauth-google" plus GOOGLE_CLIENT_ID/SECRET to enable Google login — the
 * adapter is present but deliberately refuses to claim it is configured.
 */
import { getStore, update, newId, audit } from '../db/store';
import { hashPassword, randomToken, verifyPassword, verifyTotp } from './crypto';
import type { Session, User } from '../types';

type SafeUser = Omit<User, 'passwordHash' | 'salt' | 'twoFactorSecret'>;

export type Permission =
  | 'data:upload' | 'data:edit' | 'data:approve' | 'analysis:run' | 'shortlist:write' | 'shortlist:approve'
  | 'report:write' | 'settings:ai' | 'settings:security' | 'admin:users' | 'view';

const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  owner: ['data:upload', 'data:edit', 'data:approve', 'analysis:run', 'shortlist:write', 'shortlist:approve', 'report:write', 'settings:ai', 'settings:security', 'admin:users', 'view'],
  analyst: ['data:upload', 'data:edit', 'analysis:run', 'shortlist:write', 'shortlist:approve', 'report:write', 'view'],
  // scouts can read everything and write shortlists, but cannot approve data or change settings
  scout: ['analysis:run', 'shortlist:write', 'report:write', 'view'],
  viewer: ['view'],
};

export const can = (role: User['role'], permission: Permission): boolean => ROLE_PERMISSIONS[role].includes(permission);
export const permissionsForRole = (role: User['role']): Permission[] => ROLE_PERMISSIONS[role];

const MAX_FAILED = 5;
const LOCK_MINUTES = 10;

// In-memory sliding-window rate limiter (per process). Documented as such.
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limitPerMinute: number): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - 60_000;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limitPerMinute) {
    buckets.set(key, hits);
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((hits[0] + 60_000 - now) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, remaining: limitPerMinute - hits.length, retryAfter: 0 };
}

export interface LoginResult {
  ok: boolean; error?: string; session?: Session; user?: SafeUser;
  requires2fa?: boolean; locked?: boolean;
}

const publicUser = (u: User): SafeUser => {
  const { passwordHash: _p, salt: _s, twoFactorSecret: _t, ...rest } = u;
  void _p; void _s; void _t;
  return rest;
};

export function login(email: string, password: string, totpCode?: string, meta: { ip?: string; userAgent?: string } = {}): LoginResult {
  const store = getStore();
  const user = store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    audit({ actor: email, action: 'login_failed', entity: 'user', entityId: 'unknown', detail: 'No such account', ip: meta.ip });
    return { ok: false, error: 'Invalid credentials' };
  }
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    return { ok: false, error: `Account locked until ${user.lockedUntil}. Try again later.`, locked: true };
  }
  if (!verifyPassword(password, user.passwordHash, user.salt)) {
    update((s) => {
      const u = s.users.find((x) => x.id === user.id)!;
      u.failedLogins += 1;
      if (u.failedLogins >= MAX_FAILED) u.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    });
    audit({ actor: email, action: 'login_failed', entity: 'user', entityId: user.id, detail: 'Bad password', ip: meta.ip });
    return { ok: false, error: 'Invalid credentials' };
  }
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!totpCode) return { ok: false, requires2fa: true, error: 'Two-factor code required' };
    if (!verifyTotp(user.twoFactorSecret, totpCode)) {
      audit({ actor: email, action: 'login_failed_2fa', entity: 'user', entityId: user.id, detail: 'Invalid TOTP', ip: meta.ip });
      return { ok: false, requires2fa: true, error: 'Invalid two-factor code' };
    }
  }
  const settings = getStore().settings;
  const session: Session = {
    token: randomToken(32),
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + settings.security.sessionMinutes * 60_000).toISOString(),
    ip: meta.ip ?? 'local',
    userAgent: meta.userAgent ?? 'unknown',
  };
  const updated = update((s) => {
    s.sessions = s.sessions.filter((x) => new Date(x.expiresAt) > new Date());
    s.sessions.push(session);
    const u = s.users.find((x) => x.id === user.id)!;
    u.lastLoginAt = new Date().toISOString(); u.failedLogins = 0; u.lockedUntil = null;
    return u;
  });
  audit({ actor: user.email, action: 'login', entity: 'user', entityId: user.id, detail: `Session issued, expires ${session.expiresAt}`, ip: meta.ip });
  return { ok: true, session, user: publicUser(updated) };
}

export function sessionUser(token: string | undefined | null): SafeUser | null {
  if (!token) return null;
  const store = getStore();
  const session = store.sessions.find((s) => s.token === token);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  const user = store.users.find((u) => u.id === session.userId);
  return user ? publicUser(user) : null;
}

export function logout(token: string): void {
  update((s) => { s.sessions = s.sessions.filter((x) => x.token !== token); });
}

export function register(email: string, password: string, name: string, role: User['role'] = 'analyst'): { ok: boolean; error?: string; user?: SafeUser } {
  const settings = getStore().settings;
  if (password.length < settings.security.passwordMinLength) return { ok: false, error: `Password must be at least ${settings.security.passwordMinLength} characters` };
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { ok: false, error: 'Password must include an uppercase letter and a number' };
  const store = getStore();
  if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { ok: false, error: 'Email already registered' };
  const { hash, salt } = hashPassword(password);
  const user: User = {
    id: newId('usr'), email: email.toLowerCase(), name, passwordHash: hash, salt, role,
    twoFactorEnabled: false, twoFactorSecret: null, organisationId: 'org_demo',
    createdAt: new Date().toISOString(), lastLoginAt: null, failedLogins: 0, lockedUntil: null,
  };
  update((s) => { s.users.push(user); });
  audit({ actor: email, action: 'register', entity: 'user', entityId: user.id, detail: `Role ${role}` });
  return { ok: true, user: publicUser(user) };
}

export function enable2fa(userId: string, secret: string): void {
  update((s) => {
    const u = s.users.find((x) => x.id === userId);
    if (u) { u.twoFactorEnabled = true; u.twoFactorSecret = secret; }
  });
  audit({ actor: userId, action: '2fa_enabled', entity: 'user', entityId: userId, detail: 'TOTP enrolment confirmed' });
}

export function disable2fa(userId: string): void {
  update((s) => {
    const u = s.users.find((x) => x.id === userId);
    if (u) { u.twoFactorEnabled = false; u.twoFactorSecret = null; }
  });
  audit({ actor: userId, action: '2fa_disabled', entity: 'user', entityId: userId, detail: 'TOTP removed' });
}

export function changePassword(userId: string, oldPassword: string, newPassword: string): { ok: boolean; error?: string } {
  const user = getStore().users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'User not found' };
  if (!verifyPassword(oldPassword, user.passwordHash, user.salt)) return { ok: false, error: 'Current password incorrect' };
  if (newPassword.length < getStore().settings.security.passwordMinLength) return { ok: false, error: 'New password too short' };
  const { hash, salt } = hashPassword(newPassword);
  update((s) => { const u = s.users.find((x) => x.id === userId)!; u.passwordHash = hash; u.salt = salt; });
  audit({ actor: user.email, action: 'password_changed', entity: 'user', entityId: userId, detail: 'Password rotated' });
  return { ok: true };
}

export { publicUser };
