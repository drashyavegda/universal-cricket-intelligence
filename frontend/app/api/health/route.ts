import { getStore } from '@/lib/core/db/store';
import { providerStatus } from '@/lib/core/ai/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  const analyticsUrl = process.env.ANALYTICS_SERVICE_URL;
  let analytics: { configured: boolean; reachable: boolean; detail: string } = { configured: Boolean(analyticsUrl), reachable: false, detail: 'Not configured — the TypeScript engines handle all analysis.' };
  if (analyticsUrl) {
    try {
      const res = await fetch(`${analyticsUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(2500) });
      analytics = { configured: true, reachable: res.ok, detail: res.ok ? 'Python analytics service responded' : `HTTP ${res.status}` };
    } catch (error) {
      analytics = { configured: true, reachable: false, detail: (error as Error).message };
    }
  }
  return Response.json({
    status: 'ok',
    version: '1.0.0',
    mode: store.settings.demoMode ? 'demo' : 'configured',
    referenceDate: store.settings.referenceDate,
    counts: {
      players: store.players.length, datasets: store.datasets.length, records: store.records.length,
      matches: store.matches.length, venues: store.venues.length, teams: store.teams.length,
      knowledge: store.knowledge.length, reports: store.reports.length, workflows: store.workflowRuns.length,
    },
    ai: providerStatus(),
    analyticsService: analytics,
    storage: process.env.DATABASE_URL ? 'postgres (configured)' : 'json document store (demo mode)',
  });
}
