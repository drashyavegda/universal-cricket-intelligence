import { getStore, update, audit } from '@/lib/core/db/store';
import { guard, json, fail, readBody, serverError } from '@/lib/api/helpers';
import { validateRecord } from '@/lib/core/data/extract';
import { computeAge } from '@/lib/core/data/synonyms';

export const dynamic = 'force-dynamic';

/** Edit / approve / reject a single extracted record (Feature 3). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = guard('data:edit'); if (!g.ok) return g.response;
  const body = await readBody<{ action?: 'approve' | 'reject' | 'reset'; fields?: Record<string, string | number | null>; mapped?: Record<string, unknown> }>(req);
  try {
    const store = getStore();
    const existing = store.records.find((r) => r.id === params.id);
    if (!existing) return fail('Record not found', 404);
    let updated = existing;
    update((s) => {
      const r = s.records.find((x) => x.id === params.id)!;
      if (body.fields) {
        Object.entries(body.fields).forEach(([k, v]) => { r.fields[k] = v; });
      }
      if (body.mapped) {
        Object.entries(body.mapped).forEach(([k, v]) => { (r.mapped as Record<string, unknown>)[k] = v; });
      }
      if (typeof body.mapped?.dob === 'string') {
        (r.mapped as Record<string, unknown>).age = computeAge(body.mapped.dob, s.settings.referenceDate);
      }
      r.issues = validateRecord(r, s.settings.referenceDate);
      if (body.action === 'approve') r.status = 'approved';
      else if (body.action === 'reject') r.status = 'rejected';
      else if (body.action === 'reset') r.status = 'pending';
      else r.status = 'edited';
      r.version += 1;
      r.updatedAt = new Date().toISOString();
      updated = { ...r };
      const d = s.datasets.find((x) => x.id === r.datasetId);
      if (d) d.updatedAt = r.updatedAt;
    });
    audit({ actor: g.ctx.user!.email, action: `record.${body.action ?? 'edit'}`, entity: 'record', entityId: params.id, detail: `v${updated.version} · ${updated.playerName}` });
    return json({ record: updated });
  } catch (error) { return serverError(error); }
}
