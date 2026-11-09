import { describe, expect, it } from 'vitest';
import { generatePlayers, generateTeams, generateVenues, generateMatches } from '@/lib/core/db/seed';
import { optimiseXI, DEFAULT_CONSTRAINTS } from '@/lib/core/team/xi';
import { simulateMatch, evaluatePredictionQuality } from '@/lib/core/sim/match';
import { BOWLER_ROLES, BATTER_ROLES, ALLROUNDER_ROLES } from '@/lib/core/types';

const players = generatePlayers(120, 2027, '2027-04-01');
const teams = generateTeams(players);
const venues = generateVenues();
const userTeam = teams.find((t) => t.isUserTeam)!;
const squad = players.filter((p) => userTeam.squadIds.includes(p.id));

describe('XI optimiser', () => {
  const result = optimiseXI(squad, players, { seed: 11, flavours: ['balanced', 'batting', 'bowling', 'young'] });

  it('always returns exactly 11 players', () => {
    expect(result.options.length).toBe(4);
    for (const o of result.options) expect(o.players.length).toBe(11);
    for (const o of result.options) expect(o.players.every((p) => Boolean(p.player?.id))).toBe(true);
  });

  it('respects the overseas limit, keeper requirement and bowling options', () => {
    for (const o of result.options) {
      const xi = o.players.map((x) => x.player);
      expect(xi.filter((p) => p.overseas).length).toBeLessThanOrEqual(DEFAULT_CONSTRAINTS.overseasLimit);
      if (squad.some((p) => p.wicketkeeper)) expect(xi.some((p) => p.wicketkeeper)).toBe(true);
      // the engine counts anyone with a real bowling workload as an option; assert the
      // 20-over plan actually uses at least five different bowlers, none over 4 overs
      const planBowlers = new Set(o.bowlingPlan.map((b) => b.bowlerId));
      expect(planBowlers.size).toBeGreaterThanOrEqual(DEFAULT_CONSTRAINTS.minBowlingOptions);
      const oversPerBowler = new Map<string, number>();
      for (const b of o.bowlingPlan) oversPerBowler.set(b.bowlerId, (oversPerBowler.get(b.bowlerId) ?? 0) + 1);
      for (const overs of oversPerBowler.values()) expect(overs).toBeLessThanOrEqual(4);
      const batters = xi.filter((p) => BATTER_ROLES.includes(p.role) || ALLROUNDER_ROLES.includes(p.role)).length;
      expect(batters).toBeGreaterThanOrEqual(DEFAULT_CONSTRAINTS.minBatters);
    }
  });

  it('never picks the same player twice and reports why it chose the side', () => {
    for (const o of result.options) {
      const ids = o.players.map((p) => p.player.id);
      expect(new Set(ids).size).toBe(11);
      expect(o.constraintsSatisfied.length).toBeGreaterThan(4);
      expect(o.score).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a fixed seed, whichever flavours are requested alongside', () => {
    const only = optimiseXI(squad, players, { seed: 11, flavours: ['balanced'] });
    const mixed = optimiseXI(squad, players, { seed: 11, flavours: ['young', 'batting', 'balanced'] });
    const balancedOnly = only.options.find((o) => o.flavour === 'balanced')!;
    const balancedMixed = mixed.options.find((o) => o.flavour === 'balanced')!;
    expect(balancedMixed.players.map((p) => p.player.id)).toEqual(balancedOnly.players.map((p) => p.player.id));
    expect(balancedMixed.score).toBe(balancedOnly.score);
  });

  it('honours an explicit overseas limit of 2', () => {
    const strict = optimiseXI(squad, players, { seed: 5, flavours: ['balanced'], constraints: { overseasLimit: 2 } });
    expect(strict.options[0].players.map((p) => p.player).filter((p) => p.overseas).length).toBeLessThanOrEqual(2);
  });
});

describe('match simulation', () => {
  const xiA = players.filter((p) => teams[0].squadIds.includes(p.id)).slice(0, 11);
  const xiB = players.filter((p) => teams[1].squadIds.includes(p.id)).slice(0, 11);
  const venue = venues[0];
  const opts = { simulations: 2000, seed: 424242, venue };

  it('returns probabilities that sum to one within rounding', () => {
    const r = simulateMatch({ teamId: 'A', name: 'Alpha', players: xiA }, { teamId: 'B', name: 'Beta', players: xiB }, opts);
    const total = r.teamA.winProbability + r.teamB.winProbability + r.tieProbability;
    expect(total).toBeCloseTo(1, 6);
    expect(r.teamA.winProbability).toBeGreaterThanOrEqual(0);
    expect(r.teamB.winProbability).toBeLessThanOrEqual(1);
  });

  it('is reproducible from the seed (the whole point of a deterministic engine)', () => {
    const a = simulateMatch({ teamId: 'A', name: 'Alpha', players: xiA }, { teamId: 'B', name: 'Beta', players: xiB }, opts);
    const b = simulateMatch({ teamId: 'A', name: 'Alpha', players: xiA }, { teamId: 'B', name: 'Beta', players: xiB }, opts);
    expect(a.teamA.winProbability).toBe(b.teamA.winProbability);
    expect(a.teamA.projected).toBe(b.teamA.projected);
    expect(a.momentum).toEqual(b.momentum);
  });

  it('produces ordered score quantiles and a positive simulation error', () => {
    const r = simulateMatch({ teamId: 'A', name: 'Alpha', players: xiA }, { teamId: 'B', name: 'Beta', players: xiB }, opts);
    const s = r.teamA.score;
    expect(s.p05).toBeLessThanOrEqual(s.p50);
    expect(s.p50).toBeLessThanOrEqual(s.p95);
    expect(r.simulationError).toBeGreaterThan(0);
    expect(r.assumptions.length).toBeGreaterThan(2);
  });

  it('scores historical predictions with Brier and log loss', () => {
    const matches = generateMatches(players, venues, teams);
    const evaluation = evaluatePredictionQuality(matches, players, venues, 200);
    expect(evaluation.n).toBeGreaterThan(0);
    if (evaluation.brier !== null) {
      expect(evaluation.brier).toBeGreaterThanOrEqual(0);
      expect(evaluation.brier).toBeLessThanOrEqual(1);
    }
  });
});
