import { login, logout } from '@/lib/core/auth/service';
import { json, readBody, SESSION_COOKIE, fail } from '@/lib/api/helpers';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await readBody<{ email?: string; password?: string; totp?: string }>(req);
  if (!body.email || !body.password) return fail('Email and password are required');
  const result = login(body.email, body.password, body.totp, { ip: req.headers.get('x-forwarded-for') ?? 'local', userAgent: req.headers.get('user-agent') ?? 'unknown' });
  if (!result.ok || !result.session) return fail(result.error ?? 'Login failed', 401, { requires2fa: result.requires2fa ?? false });
  const response = json({ ok: true, user: result.user, expiresAt: result.session.expiresAt });
  response.cookies.set(SESSION_COOKIE, result.session.token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) logout(token);
  const response = json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
