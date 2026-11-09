import { json, readBody, fail, guard, serverError } from '@/lib/api/helpers';
import { approveWorkflow } from '@/lib/core/ai/agents';
import { getStore, audit } from '@/lib/core/db/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const run = store.workflowRuns.find((r) => r.id === params.id);
  if (!run) return fail('Run not found', 404);
  return json({ run });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = guard('report:write'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ action: 'approve' }>(req);
    if (body.action !== 'approve') return fail('Unsupported action');
    const run = approveWorkflow(params.id, g.ctx.user!.email);
    audit({ actor: g.ctx.user!.email, action: 'workflow.approve', entity: 'workflow', entityId: params.id, detail: `Status ${run.status}` });
    return json({ run });
  } catch (error) { return serverError(error); }
}
