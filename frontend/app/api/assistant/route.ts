import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { answerQuery } from '@/lib/core/ai/assistant';
import { guardPrompt } from '@/lib/core/ai/gateway';
import { getStore } from '@/lib/core/db/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ query: string; language?: 'en' | 'hi' | 'gu'; useAi?: boolean }>(req);
    if (!body.query?.trim()) return json({ error: 'Ask a question first.' }, { status: 400 });
    const store = getStore();
    const guard = guardPrompt(body.query);
    if (!guard.safe && store.settings.security.promptInjectionGuard) {
      return json({
        query: body.query,
        blocked: true,
        answer: 'That request contains an instruction-override pattern, so I did not execute it. I only run analytics over the workspace data — I will not follow instructions embedded in a question, file or external document.',
        redactions: guard.redactions,
      });
    }
    const answer = await answerQuery(body.query, { language: body.language, useAi: body.useAi });
    return json(answer);
  } catch (error) { return serverError(error); }
}
