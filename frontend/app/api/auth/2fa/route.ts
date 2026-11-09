import { context, json, fail, guard, readBody } from '@/lib/api/helpers';
import { generateTotpSecret, totp } from '@/lib/core/auth/crypto';
import { enable2fa, disable2fa } from '@/lib/core/auth/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = context();
  if (!ctx.user) return fail('Sign in required', 401);
  const secret = generateTotpSecret();
  return json({
    secret,
    currentCode: totp(secret),
    otpauth: `otpauth://totp/UCIP:${encodeURIComponent(ctx.user.email)}?secret=${secret}&issuer=UniversalCricketIntelligence`,
    note: 'Enter the secret in any TOTP app (or the code shown) to verify locally. The secret is generated server-side and never persisted until you confirm.',
  });
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  const body = await readBody<{ action: 'enable' | 'disable'; secret?: string }>(req);
  if (body.action === 'enable') {
    if (!body.secret) return fail('secret required');
    enable2fa(g.ctx.user!.id, body.secret);
    return json({ ok: true, enabled: true });
  }
  disable2fa(g.ctx.user!.id);
  return json({ ok: true, enabled: false });
}
