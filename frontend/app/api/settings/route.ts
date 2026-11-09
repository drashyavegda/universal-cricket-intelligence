import { getStore, update, audit } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { providerStatus, aiBudgetStatus } from '@/lib/core/ai/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  return json({
    settings: {
      ...store.settings,
      ai: { ...store.settings.ai, hasApiKey: Boolean(process.env.AI_API_KEY) },
    },
    aiStatus: providerStatus(),
    budget: aiBudgetStatus(),
    usage: store.aiUsage.slice(0, 25),
    users: store.users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, twoFactorEnabled: u.twoFactorEnabled, lastLoginAt: u.lastLoginAt })),
    sessions: store.sessions.map((s) => ({ createdAt: s.createdAt, expiresAt: s.expiresAt, ip: s.ip, userId: s.userId })),
    envHints: [
      { key: 'AI_API_KEY', set: Boolean(process.env.AI_API_KEY), note: 'Server-side only. Never returned to the browser.' },
      { key: 'AI_BASE_URL', set: Boolean(process.env.AI_BASE_URL), note: 'OpenAI-compatible endpoint.' },
      { key: 'AI_MODEL', set: Boolean(process.env.AI_MODEL), note: 'Model id used for narration.' },
      { key: 'DATABASE_URL', set: Boolean(process.env.DATABASE_URL), note: 'PostgreSQL connection string for production mode.' },
      { key: 'ANALYTICS_SERVICE_URL', set: Boolean(process.env.ANALYTICS_SERVICE_URL), note: 'Optional Python analytics service.' },
      { key: 'GOOGLE_CLIENT_ID', set: Boolean(process.env.GOOGLE_CLIENT_ID), note: 'Google OAuth is an adapter stub; not active unless implemented.' },
      { key: 'FIELD_ENCRYPTION_KEY', set: Boolean(process.env.FIELD_ENCRYPTION_KEY), note: 'AES-256-GCM key for field-level encryption.' },
    ],
  });
}

export async function PATCH(req: Request) {
  const g = guard('settings:ai'); if (!g.ok) return g.response;
  try {
    const body = await readBody<Partial<{ referenceDate: string; language: 'en' | 'hi' | 'gu'; ai: Partial<import('@/lib/core/types').PlatformSettings['ai']>; limits: Partial<import('@/lib/core/types').PlatformSettings['limits']>; security: Partial<import('@/lib/core/types').PlatformSettings['security']> }>>(req);
    update((s) => {
      if (body.referenceDate) s.settings.referenceDate = body.referenceDate;
      if (body.language) s.settings.language = body.language;
      if (body.ai) {
        const { hasApiKey: _ignore, ...rest } = body.ai;
        void _ignore;
        s.settings.ai = { ...s.settings.ai, ...rest };
      }
      if (body.limits) s.settings.limits = { ...s.settings.limits, ...body.limits };
      if (body.security) s.settings.security = { ...s.settings.security, ...body.security };
    });
    audit({ actor: g.ctx.user!.email, action: 'settings.update', entity: 'settings', entityId: 'platform', detail: JSON.stringify(Object.keys(body)) });
    return json({ ok: true, settings: getStore().settings, note: 'API keys are configured only via server environment variables — they cannot be set from the browser.' });
  } catch (error) { return serverError(error); }
}
