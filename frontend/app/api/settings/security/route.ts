import { guard, json, readBody } from '@/lib/api/helpers';
import { securityScore, simulateThreat } from '@/lib/core/security/posture';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  return json(securityScore());
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  const body = await readBody<{ controlId?: string }>(req);
  const scenario = body.controlId ? simulateThreat(body.controlId) : null;
  return json({ scenario });
}
