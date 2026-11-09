import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionUser, can, type Permission } from '../core/auth/service';
import type { User } from '../core/types';

export type SafeUser = Omit<User, 'passwordHash' | 'salt' | 'twoFactorSecret'>;

export const SESSION_COOKIE = 'ucip_session';

export interface RequestContext { user: SafeUser | null; role: User['role'] }

export function context(): RequestContext {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = sessionUser(token);
  return { user, role: user?.role ?? 'viewer' };
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Guest access is allowed for read/compute; persistence requires a real session + permission. */
export function guard(permission: Permission): { ok: true; ctx: RequestContext } | { ok: false; response: NextResponse } {
  const ctx = context();
  if (!ctx.user) {
    return { ok: false, response: fail('Sign in required for this action. Use the Demo accounts shown on the sign-in page.', 401, { code: 'AUTH_REQUIRED' }) };
  }
  if (!can(ctx.role, permission)) {
    return { ok: false, response: fail(`Your role (${ctx.role}) lacks the "${permission}" permission.`, 403, { code: 'FORBIDDEN' }) };
  }
  return { ok: true, ctx };
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error('[api]', message);
  return NextResponse.json({ error: message }, { status: 500 });
}
