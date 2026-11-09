import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { scoutOpposition } from '@/lib/core/team/opposition';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ opponentId?: string }>(req);
    const store = getStore();
    const userTeam = store.teams.find((t) => t.isUserTeam)!;
    const opponent = store.teams.find((t) => t.id === body.opponentId) ?? store.teams.find((t) => t.id !== userTeam.id)!;
    const squad = store.players.filter((p) => opponent.squadIds.includes(p.id));
    const ownSquad = store.players.filter((p) => userTeam.squadIds.includes(p.id));
    const report = scoutOpposition(opponent, squad, store.players, store.matches, store.matches.flatMap((m) => m.events), ownSquad);
    return json({
      report,
      teams: store.teams.filter((t) => !t.isUserTeam).map((t) => ({ id: t.id, name: t.name })),
      ownTeam: { id: userTeam.id, name: userTeam.name },
    });
  } catch (error) { return serverError(error); }
}
