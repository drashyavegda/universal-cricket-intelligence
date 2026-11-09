import { getStore } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { buildCohort } from '@/lib/core/players/metrics';
import { assessPotential, potentialForPlayers, ageDistribution } from '@/lib/core/players/potential';
import { rankPlayers } from '@/lib/core/ranking/engine';
import { STRATEGY_PRESETS, presetByKey } from '@/lib/core/ranking/presets';
import type { PlayerRole } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

/** Young talent discovery (Feature 6) + RR hackathon workspace. */
export async function POST(req: Request) {
  const g = guard('view'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{
      maxAge?: number; minAge?: number; uncappedOnly?: boolean; domesticOnly?: boolean;
      roles?: PlayerRole[]; presetKey?: string; size?: number; weights?: Record<string, number>; ageWeight?: number;
    }>(req);
    const store = getStore();
    const events = store.matches.flatMap((m) => m.events);
    const maxAge = body.maxAge ?? 23;
    const minAge = body.minAge ?? 16;
    const preset = presetByKey(body.presetKey ?? 'young_talented_batter') ?? STRATEGY_PRESETS[0];

    let pool = store.players.filter((p) => p.age !== null && p.age >= minAge && p.age <= maxAge);
    if (body.uncappedOnly !== false) pool = pool.filter((p) => !p.capped);
    if (body.domesticOnly !== false) pool = pool.filter((p) => !p.overseas);

    const ranking = rankPlayers(pool, {
      weights: body.weights ?? preset.weights,
      roles: body.roles?.length ? body.roles : undefined,
      ageWeight: body.ageWeight ?? preset.ageWeight ?? 0.6,
      limit: body.size ?? 20,
      presetKey: preset.key,
      requireAge: true,
    }, events);
    const cohort = buildCohort(pool, events);
    const potentials = potentialForPlayers(cohort);

    return json({
      filters: { maxAge, minAge, uncappedOnly: body.uncappedOnly !== false, domesticOnly: body.domesticOnly !== false, preset: preset.key, roles: body.roles ?? [] },
      counts: { poolSize: pool.length, eligibleWithDob: pool.length, excludedNoDob: store.players.filter((p) => p.age === null).length },
      rows: ranking.rows.map((r) => ({
        rank: r.rank, score: r.score, rawScore: r.rawScore, evidenceAdjustment: r.evidenceAdjustment, ageBonus: r.ageBonus,
        positives: r.positives, negatives: r.negatives, explanation: r.explanation, coverage: r.coverage,
        potential: potentials.find((p) => p.playerId === r.player.id),
        player: {
          id: r.player.id, name: r.player.name, age: r.player.age, dob: r.player.dob, role: r.player.role, team: r.player.team,
          state: r.player.state, capped: r.player.capped, overseas: r.player.overseas, synthetic: r.player.synthetic,
          strikeRate: r.player.batting.balls ? Number((r.player.batting.runs / r.player.batting.balls * 100).toFixed(1)) : null,
          average: r.player.batting.dismissals ? Number((r.player.batting.runs / r.player.batting.dismissals).toFixed(1)) : null,
          economy: r.player.bowling.balls ? Number((r.player.bowling.runsConceded / r.player.bowling.balls * 6).toFixed(2)) : null,
          bowlingSR: r.player.bowling.wickets ? Number((r.player.bowling.balls / r.player.bowling.wickets).toFixed(1)) : null,
          runs: r.player.batting.runs, balls: r.player.batting.balls, wickets: r.player.bowling.wickets,
          confidence: r.player.confidence, sampleLabel: (r.player.batting.balls < 60 ? 'insufficient' : r.player.batting.balls < 180 ? 'limited' : r.player.batting.balls < 450 ? 'moderate' : 'strong'),
        },
      })),
      ageDistribution: ageDistribution(pool),
      sensitivity: ranking.sensitivity,
      assumptions: ranking.assumptions,
      roleGaps: { batters: ranking.rows.filter((r) => ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Finisher'].includes(r.player.role)).length, bowlers: ranking.rows.filter((r) => r.player.role.includes('Bowler')).length, allRounders: ranking.rows.filter((r) => r.player.role.includes('All-rounder')).length },
      rrWorkspace: {
        brief: `Identify the ${body.size ?? 10} most promising uncapped domestic Indian players aged ${maxAge} or younger for IPL 2027, balancing age, performance, role, consistency, potential and data reliability.`,
        referenceDate: store.settings.referenceDate,
        warnings: [
          'Age is a headroom multiplier, not the ranking criterion: the model does not simply sort by date of birth.',
          'Eligibility (uncapped/domestic) is taken from dataset flags — verify against official competition rules before acting.',
          'All demo records are synthetic; upload the official competition dataset to produce real recommendations.',
        ],
        weightsUsed: body.weights ?? preset.weights,
        presets: STRATEGY_PRESETS.map((p) => ({ key: p.key, label: p.label, blurb: p.blurb })),
      },
    });
  } catch (error) { return serverError(error); }
}
