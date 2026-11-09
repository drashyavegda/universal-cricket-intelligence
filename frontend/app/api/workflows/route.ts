import { getStore, update, audit } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { AGENTS, WORKFLOWS, startWorkflow } from '@/lib/core/ai/agents';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  return json({
    agents: AGENTS, workflows: WORKFLOWS, runs: store.workflowRuns.slice(0, 20),
    governance: {
      note: 'Agents run read-only analysis steps. Any step that writes a saved artefact requires explicit human approval.',
      isolation: AGENTS.map((a) => ({ agent: a.name, permissions: a.permissions })),
    },
  });
}

export async function POST(req: Request) {
  const g = guard('analysis:run'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ workflowId: string; maxAge?: number; presetKey?: string; goal?: string }>(req);
    if (!WORKFLOWS.some((w) => w.id === body.workflowId)) return fail('Unknown workflow');
    const run = startWorkflow(body.workflowId, { maxAge: body.maxAge, presetKey: body.presetKey, goal: body.goal, actor: g.ctx.user!.email });
    audit({ actor: g.ctx.user!.email, action: 'workflow.start', entity: 'workflow', entityId: run.id, detail: `${body.workflowId} → ${run.status}` });
    update(() => undefined);
    return json({ run });
  } catch (error) { return serverError(error); }
}
