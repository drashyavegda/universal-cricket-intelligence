import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError, fail } from '@/lib/api/helpers';
import { mergeDatasets } from '@/lib/core/data/merge';

export const dynamic = 'force-dynamic';

/** Multi-file intelligent merging (Feature 4). */
export async function POST(req: Request) {
  const g = guard('data:approve'); if (!g.ok) return g.response;
  const body = await readBody<{ datasetIds: string[] }>(req);
  try {
    const store = getStore();
    const ids = body.datasetIds?.length ? body.datasetIds : store.datasets.map((d) => d.id);
    const inputs = ids.map((id) => ({ datasetId: id, records: store.records.filter((r) => r.datasetId === id) })).filter((i) => i.records.length > 0);
    if (inputs.length < 2) return fail('Select at least two datasets with records to merge.', 400);
    const formats = new Set(inputs.map((i) => store.datasets.find((d) => d.id === i.datasetId)?.format));
    const seasons = new Set(inputs.map((i) => store.datasets.find((d) => d.id === i.datasetId)?.season));
    const { candidates, stats } = mergeDatasets(inputs, { ageReference: store.settings.referenceDate });
    const warnings: string[] = [];
    if (formats.size > 1) warnings.push(`Selected datasets mix formats (${[...formats].join(', ')}). Merge only like-for-like competitions; scoring rates are not comparable across formats.`);
    if (seasons.size > 1) warnings.push(`Selected datasets mix seasons (${[...seasons].join(', ')}). Confirm this is intentional before combining career and season figures.`);
    return json({
      stats, warnings,
      candidates: candidates.slice(0, 200),
      method: [
        'Identity key: lowercased full name with single initials stripped; near matches are surfaced, never auto-merged.',
        'Numeric conflicts are flagged when values differ by more than max(2, 2% of the larger value) — a tolerance, not an equality test.',
        'Resolution defaults to the highest-confidence source; unresolved conflicts stay null until a human decides.',
        'Every surviving field retains dataset + record provenance for the audit trail.',
      ],
    });
  } catch (error) { return serverError(error); }
}
