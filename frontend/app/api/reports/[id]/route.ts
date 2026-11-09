import { getStore } from '@/lib/core/db/store';
import { guard, json, fail } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const report = store.reports.find((r) => r.id === params.id);
  if (!report) return fail('Report not found', 404);
  return json({ report });
}
