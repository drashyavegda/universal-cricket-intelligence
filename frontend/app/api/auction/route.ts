import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { buildCohort } from '@/lib/core/players/metrics';
import { marketOverview, valuatePlayer, valueRanking, roleScarcity, teamNeedFor } from '@/lib/core/auction/valuation';
import { simulateAuction } from '@/lib/core/auction/sim';
import type { Player } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const url = new URL(req.url);
    const teamId = url.searchParams.get('teamId') ?? store.teams.find((t) => t.isUserTeam)!.id;
    const team = store.teams.find((t) => t.id === teamId)!;
    const cohort = buildCohort(store.players, store.matches.flatMap((m) => m.events));
    const pool = store.players.filter((p) => !p.overseas);
    const market = marketOverview(pool, cohort, store.teams, store.auctions, store.players);
    const squad = store.players.filter((p) => team.squadIds.includes(p.id));
    const valuations = market.rows;
    return json({
      team: { id: team.id, name: team.name, purseLakh: team.purseLakh, slots: team.maxSquadSize - squad.length, overseasLimit: team.overseasLimit },
      budget: {
        totalPurseLakh: team.purseLakh,
        spentLakh: 0,
        remainingLakh: team.purseLakh,
        vacantSlots: team.maxSquadSize - squad.length,
        overseasSlots: team.overseasLimit - squad.filter((p) => p.overseas).length,
        averagePerSlotLakh: Number((team.purseLakh / Math.max(1, team.maxSquadSize - squad.length)).toFixed(0)),
      },
      valuations: valuations.slice(0, 60),
      valueBuckets: (() => { const v = valueRanking(valuations); return { overpriced: v.overpriced.slice(0, 6), undervalued: v.undervalued.slice(0, 6) }; })(),
      roleShortage: market.roleShortage,
      tierStats: market.tierStats,
      method: market.method,
      history: store.auctions.slice(0, 15),
      caveat: 'All auction prices and valuations in demo mode are synthetic. Estimated value is not an expected hammer price.',
    });
  } catch (error) { return serverError(error); }
}

/** Auction simulation & decision support (Feature 11). */
export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      teamId?: string; purseLakh?: number; seed?: number; aggression?: number; maxLots?: number; playerIds?: string[]; mode?: 'valuation' | 'simulate';
    }>(req);
    const store = getStore();
    const events = store.matches.flatMap((m) => m.events);
    const cohort = buildCohort(store.players, events);
    const userTeam = store.teams.find((t) => t.id === (body.teamId ?? store.teams.find((x) => x.isUserTeam)!.id))!;
    const pool: Player[] = body.playerIds?.length
      ? store.players.filter((p) => body.playerIds!.includes(p.id))
      : store.players.filter((p) => !p.overseas).sort((a, b) => b.batting.runs - a.batting.runs).slice(0, 40);

    const valuations: Record<string, ReturnType<typeof valuatePlayer>> = {};
    for (const p of pool) {
      valuations[p.id] = valuatePlayer({
        player: p, cohort, roleScarcity: roleScarcity(pool, cohort, p.role),
        teamNeed: teamNeedFor(userTeam, store.players.filter((x) => userTeam.squadIds.includes(x.id)), p.role).need,
        competitorDemand: Math.min(1, 0.25 + p.confidence * 0.3 + (p.age !== null && p.age < 23 ? 0.25 : 0.05)),
        history: store.auctions,
      });
    }

    const sim = simulateAuction({
      players: pool, valuations, teams: store.teams, allPlayers: store.players,
      userTeamId: userTeam.id, purseLakh: body.purseLakh, seed: body.seed ?? 2027,
      aggression: body.aggression ?? 1, maxLots: body.maxLots ?? 25,
    });

    return json({
      ...sim,
      valuations: Object.values(valuations).sort((a, b) => b.fairValueLakh - a.fairValueLakh).slice(0, 40),
      disclaimer: 'Simulated franchises use only visible needs, purse, role scarcity and alternatives. They do not represent real franchise intentions, information or bidding behaviour.',
    });
  } catch (error) { return serverError(error); }
}
