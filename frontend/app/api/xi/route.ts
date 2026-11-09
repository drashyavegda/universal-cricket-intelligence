import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, fail, serverError } from '@/lib/api/helpers';
import { optimiseXI, FLAVOURS } from '@/lib/core/team/xi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  return json({ flavours: FLAVOURS });
}

/** Playing XI & combination optimisation (Feature 18). */
export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      teamId?: string; venueId?: string; overseasLimit?: number; requireKeeper?: boolean; minBowlingOptions?: number;
      minBatters?: number; excludedIds?: string[]; unavailableIds?: string[]; maxAge?: number | null;
      flavours?: ('balanced' | 'batting' | 'bowling' | 'young' | 'matchup')[]; seed?: number;
    }>(req);
    const store = getStore();
    const team = store.teams.find((t) => t.id === (body.teamId ?? store.teams.find((x) => x.isUserTeam)!.id));
    if (!team) return fail('Team not found', 404);
    const squad = store.players.filter((p) => team.squadIds.includes(p.id));
    const venue = store.venues.find((v) => v.id === body.venueId) ?? null;
    const events = store.matches.flatMap((m) => m.events);
    const result = optimiseXI(squad, store.players, {
      venue, events, seed: body.seed ?? 11,
      flavours: body.flavours ?? ['balanced', 'batting', 'bowling'],
      constraints: {
        overseasLimit: body.overseasLimit ?? 4,
        requireKeeper: body.requireKeeper ?? true,
        minBowlingOptions: body.minBowlingOptions ?? 5,
        minBatters: body.minBatters ?? 5,
        maxAge: body.maxAge ?? null,
        excludedIds: body.excludedIds ?? [],
        unavailableIds: body.unavailableIds ?? [],
      },
    });
    return json({
      team: { id: team.id, name: team.name },
      venue: venue ? { id: venue.id, name: venue.name } : null,
      cohortSize: result.cohortSize,
      notes: result.notes,
      options: result.options.map((o) => ({
        ...o,
        players: o.players.map((p) => ({
          id: p.player.id, name: p.player.name, role: p.player.role, age: p.player.age, overseas: p.player.overseas,
          battingPosition: p.battingPosition, bowlingOvers: p.bowlingOvers, contributions: p.contributions,
          synthetic: p.player.synthetic,
        })),
      })),
    });
  } catch (error) { return serverError(error); }
}
