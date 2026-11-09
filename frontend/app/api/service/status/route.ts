import { guard, json, serverError } from '@/lib/api/helpers';
import { backendStatus } from '@/lib/api/backend';

/**
 * Connection status of the standalone FastAPI service.
 *
 * Returns 200 even when the service is unreachable or unconfigured: "the dependency is down" is a
 * normal, expected state that the UI must be able to display, not a request error. The payload
 * always says which engine is currently serving analytics.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const g = guard('view');
  if (!g.ok) return g.response;
  try {
    return json(await backendStatus(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return serverError(error);
  }
}
