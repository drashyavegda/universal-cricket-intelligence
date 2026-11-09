import { getStore } from '@/lib/core/db/store';
import { guard, json, fail } from '@/lib/api/helpers';
import { analyseDatasetQuality } from '@/lib/core/data/quality';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const dataset = store.datasets.find((d) => d.id === params.id);
  if (!dataset) return fail('Dataset not found', 404);
  const records = store.records.filter((r) => r.datasetId === params.id);
  const quality = analyseDatasetQuality(records, { datasetId: params.id, ageReference: store.settings.referenceDate });
  return json({
    dataset: { id: dataset.id, name: dataset.name, status: dataset.status },
    quality,
    pending: records.filter((r) => r.status === 'pending').length,
    approved: records.filter((r) => r.status === 'approved').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    edits: records.filter((r) => r.version > 1).length,
  });
}
