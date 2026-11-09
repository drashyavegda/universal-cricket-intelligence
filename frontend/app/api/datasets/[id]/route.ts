import { getStore } from '@/lib/core/db/store';
import { guard, json, fail, serverError } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const dataset = store.datasets.find((d) => d.id === params.id);
    if (!dataset) return fail('Dataset not found', 404);
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const status = url.searchParams.get('status') ?? 'all';
    const severity = url.searchParams.get('severity') ?? 'all';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(200, Number(url.searchParams.get('pageSize') ?? 25));
    const sort = url.searchParams.get('sort') ?? 'row';

    let records = store.records.filter((r) => r.datasetId === params.id);
    if (q) records = records.filter((r) => r.playerName.toLowerCase().includes(q) || Object.values(r.fields).some((v) => String(v ?? '').toLowerCase().includes(q)));
    if (status !== 'all') records = records.filter((r) => r.status === status);
    if (severity !== 'all') records = records.filter((r) => r.issues.some((i) => i.severity === severity));
    if (sort === 'confidence') records = [...records].sort((a, b) => a.confidence - b.confidence);
    else if (sort === 'name') records = [...records].sort((a, b) => a.playerName.localeCompare(b.playerName));
    else records = [...records].sort((a, b) => a.sourceRow - b.sourceRow);

    const total = records.length;
    const paged = records.slice((page - 1) * pageSize, page * pageSize);
    return json({
      dataset,
      records: paged,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      columns: Array.from(new Set(records.flatMap((r) => Object.keys(r.fields)))),
      statusCounts: {
        pending: records.filter((r) => r.status === 'pending').length,
        approved: records.filter((r) => r.status === 'approved').length,
        rejected: records.filter((r) => r.status === 'rejected').length,
        edited: records.filter((r) => r.status === 'edited').length,
      },
    });
  } catch (error) { return serverError(error); }
}
