import { getStore, update, audit } from '@/lib/core/db/store';
import { promoteDataset } from '@/lib/core/data/promote';
import { context, guard, json, readBody, serverError } from '@/lib/api/helpers';
import { analyseDatasetQuality } from '@/lib/core/data/quality';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = getStore();
    const datasets = store.datasets.map((d) => {
      const records = store.records.filter((r) => r.datasetId === d.id);
      const quality = analyseDatasetQuality(records, { datasetId: d.id, ageReference: store.settings.referenceDate });
      return {
        ...d, recordCount: records.length, qualityScore: quality.score,
        counts: quality.counts, duplicateGroups: quality.duplicateGroups.length,
        pending: records.filter((r) => r.status === 'pending').length,
        rejected: records.filter((r) => r.status === 'rejected').length,
      };
    });
    return json({ datasets, sources: store.sources, limits: store.settings.limits });
  } catch (error) { return serverError(error); }
}

export async function PATCH(req: Request) {
  const g = guard('data:approve'); if (!g.ok) return g.response;
  const body = await readBody<{ datasetId: string; status?: 'approved' | 'needs_review'; notes?: string }>(req);
  try {
    update((s) => {
      const d = s.datasets.find((x) => x.id === body.datasetId);
      if (d) {
        if (body.status) d.status = body.status;
        if (body.notes !== undefined) d.notes = body.notes;
        d.updatedAt = new Date().toISOString();
      }
    });
    audit({ actor: g.ctx.user!.email, action: 'dataset.status', entity: 'dataset', entityId: body.datasetId, detail: `Status → ${body.status}` });
    const promotion = body.status === 'approved' ? promoteDataset(body.datasetId, g.ctx.user!.email) : null;
    return json({ ok: true, ctx: context().user?.email, promotion });
  } catch (error) { return serverError(error); }
}
