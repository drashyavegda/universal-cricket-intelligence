import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { analyseWorkload, workloadWhatIf } from '@/lib/core/workload/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const squad = store.players.slice(0, 60).map((p) => analyseWorkload(p, store.settings.referenceDate));
  return json({
    profiles: squad,
    referenceDate: store.settings.referenceDate,
    summary: {
      elevated: squad.filter((s) => s.riskIndicator === 'elevated').length,
      watch: squad.filter((s) => s.riskIndicator === 'watch').length,
      low: squad.filter((s) => s.riskIndicator === 'low').length,
    },
    policy: 'This module quantifies match load from logs. It does not diagnose injury, and it never declares a player fit or unavailable. Verified availability data must come from an authorised source.',
  });
}

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ playerId: string; extraMatches?: number; extraOvers?: number; availability?: 'unknown' | 'available' | 'managed' | 'unavailable' }>(req);
    const store = getStore();
    const player = store.players.find((p) => p.id === body.playerId) ?? store.players[0];
    const profile = analyseWorkload(player, store.settings.referenceDate, {
      availability: body.availability && body.availability !== 'unknown'
        ? { status: body.availability, note: 'Status set manually by a user with verified information.' }
        : undefined,
    });
    return json({
      profile,
      whatIf: workloadWhatIf(profile, body.extraMatches ?? 0, body.extraOvers ?? 0),
      players: store.players.slice(0, 60).map((p) => ({ id: p.id, name: p.name, role: p.role, age: p.age })),
    });
  } catch (error) { return serverError(error); }
}
