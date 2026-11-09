import { getStore } from '@/lib/core/db/store';
import { guard, json } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const limit = Math.min(500, Number(new URL(req.url).searchParams.get('limit') ?? 100));
  return json({ audit: store.audit.slice(0, limit), total: store.audit.length });
}
