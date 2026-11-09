import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { runScoutingMission } from '@/lib/core/scouting/global';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ region?: string; ageMin?: number; ageMax?: number; role?: string | null; name?: string }>(req);
    const store = getStore();
    const result = runScoutingMission(store.players, {
      name: body.name ?? 'Custom scouting mission',
      region: body.region ?? 'Any',
      ageMin: body.ageMin ?? 16,
      ageMax: body.ageMax ?? 23,
      role: body.role ?? null,
      createdBy: 'workspace',
      watchlist: [],
      notes: '',
    }, store.matches.flatMap((m) => m.events));
    return json({
      ...result,
      regions: ['Any', ...new Set(store.players.map((p) => p.team))].sort(),
      roles: [...new Set(store.players.map((p) => p.role))].sort(),
      sourceSets: {
        uploaded: store.players.filter((p) => p.sources.some((s) => s.kind === 'uploaded')).length,
        demo: store.players.filter((p) => p.synthetic).length,
        external: store.players.filter((p) => p.sources.some((s) => s.kind === 'external')).length,
      },
      identityNote: 'Players are matched on normalised name plus team; ambiguous near-matches require manual confirmation and are never merged silently.',
    });
  } catch (error) { return serverError(error); }
}
