import { getStore, update } from '@/lib/core/db/store';
import { guard, json, readBody } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  return json({ notifications: store.notifications, unread: store.notifications.filter((n) => !n.read).length });
}

export async function PATCH(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  const body = await readBody<{ id?: string; all?: boolean }>(req);
  update((s) => { s.notifications = s.notifications.map((n) => (body.all || n.id === body.id ? { ...n, read: true } : n)); });
  return json({ ok: true });
}
