import { getStore } from '@/lib/core/db/store';
import { guard, json } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  return json({
    teams: store.teams.map((t) => ({
      ...t,
      squadSize: t.squadIds.length,
      overseasCount: store.players.filter((p) => t.squadIds.includes(p.id) && p.overseas).length,
      isUserTeam: t.isUserTeam,
    })),
  });
}
