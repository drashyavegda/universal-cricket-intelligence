import { fail, guard, json, readBody, serverError } from '@/lib/api/helpers';
import { feedbackStats, listFeedback, setFeedbackStatus } from '@/lib/core/growth/feedback';
import type { FeedbackSubmission } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

/** Workspace inbox for public submissions. Analyst-level access and above. */
export async function GET() {
  const g = guard('report:write');
  if (!g.ok) return g.response;
  try {
    return json({ feedback: listFeedback(), stats: feedbackStats() });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  const g = guard('report:write');
  if (!g.ok) return g.response;
  try {
    const body = await readBody<{ id?: string; status?: FeedbackSubmission['status'] }>(req);
    if (!body.id || !body.status || !['new', 'acknowledged', 'closed'].includes(body.status)) return fail('id and a valid status are required', 400);
    const result = setFeedbackStatus(body.id, body.status, g.ctx.user!.email);
    if (!result.ok) return fail('Submission not found.', 404);
    return json({ ok: true, stats: feedbackStats() });
  } catch (error) {
    return serverError(error);
  }
}
