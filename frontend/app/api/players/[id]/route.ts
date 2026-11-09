import { getStore } from '@/lib/core/db/store';
import { guard, json, fail, serverError } from '@/lib/api/helpers';
import { buildCohort, computePlayerMetrics } from '@/lib/core/players/metrics';
import { assessPotential } from '@/lib/core/players/potential';
import { assessRisk } from '@/lib/core/players/risk';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS } from '@/lib/core/ranking/presets';
import { valuatePlayer } from '@/lib/core/auction/valuation';
import { buildTrajectory } from '@/lib/core/career/trajectory';
import { analyseWorkload } from '@/lib/core/workload/engine';
import { describe } from '@/lib/core/stats/descriptive';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const store = getStore();
    const player = store.players.find((p) => p.id === params.id);
    if (!player) return fail('Player not found', 404);
    const events = store.matches.flatMap((m) => m.events);
    const cohort = buildCohort(store.players, events);
    const row = cohort.find((r) => r.player.id === player.id)!;
    const metrics = computePlayerMetrics(player, events);
    const potential = assessPotential(row);
    const preset = STRATEGY_PRESETS[0];
    const ranking = rankPlayers(store.players, { weights: preset.weights, limit: store.players.length, presetKey: preset.key }, events);
    const ranked = ranking.rows.find((r) => r.player.id === player.id);
    const valuation = valuatePlayer({ player, cohort, roleScarcity: 0.6, teamNeed: 0.5, competitorDemand: 0.5, history: store.auctions });
    const risk = assessRisk(row, { potential: potential.potential, estValueLakh: valuation.fairValueLakh, priceLakh: store.auctions.find((a) => a.playerId === player.id)?.soldPriceLakh ?? null });
    const trajectory = buildTrajectory(player);
    const workload = analyseWorkload(player, store.settings.referenceDate);
    const team = store.teams.find((t) => t.isUserTeam);
    const squad = team ? store.players.filter((p) => team.squadIds.includes(p.id)) : [];
    const draftable = !player.capped && !player.overseas;

    return json({
      player,
      metrics,
      percentiles: row.percentiles,
      potential,
      risk,
      valuation,
      trajectory,
      workload,
      rankingCard: ranked ? { rank: ranked.rank, of: ranking.rows.length, score: ranked.score, components: ranked.components, explanation: ranked.explanation, positives: ranked.positives, negatives: ranked.negatives } : null,
      situational: {
        inningsLog: player.matchLog,
        runsDistribution: describe(player.matchLog.map((m) => m.runs)),
        phaseBatting: player.phaseBatting,
        phaseBowling: player.phaseBowling,
      },
      eligibility: {
        uncapped: !player.capped,
        domestic: !player.overseas,
        draftable,
        ageAtReference: player.age,
        referenceDate: store.settings.referenceDate,
        note: player.synthetic ? 'DEMO record — synthetic player, not a real cricketer.' : 'Eligibility flags come from the uploaded dataset; verify against official competition rules.',
      },
      inUserSquad: squad.some((p) => p.id === player.id),
      similarPlayers: cohort
        .filter((r) => r.player.role === player.role && r.player.id !== player.id)
        .sort((a, b) => Math.abs((a.player.age ?? 25) - (player.age ?? 25)) - Math.abs((b.player.age ?? 25) - (player.age ?? 25)))
        .slice(0, 4).map((r) => ({ id: r.player.id, name: r.player.name, age: r.player.age, score: r.metrics.batting.strikeRate })),
    });
  } catch (error) { return serverError(error); }
}
